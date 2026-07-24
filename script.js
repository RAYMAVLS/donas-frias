"use strict";

const CONFIG_PATH = "./content/site.json";

const STORAGE_KEY =
  "donas_frias_completed_levels";

let siteData = null;
let activeLevels = [];
let completed = new Set();

let currentLevelIndex = 0;
let gameCleanup = null;

const gameArea =
  document.getElementById("gameArea");

const unlockedArea =
  document.getElementById("unlockedArea");

const siteTitle =
  document.getElementById("siteTitle");

const progressText =
  document.getElementById("progressText");

const resetButton =
  document.getElementById("resetButton");

const toast =
  document.getElementById("toast");


/* -------------------------
   INITIALIZE
------------------------- */

async function init() {
  try {

    const response = await fetch(
      `${CONFIG_PATH}?v=${Date.now()}`,
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(
        "No se pudo cargar site.json"
      );
    }

    siteData =
      await response.json();

    if (
      !siteData ||
      !Array.isArray(siteData.levels)
    ) {
      throw new Error(
        "Configuración inválida"
      );
    }

    activeLevels =
      siteData.levels.filter(
        level =>
          level &&
          level.enabled !== false &&
          level.title &&
          level.url
      );

    siteTitle.textContent =
      siteData.siteTitle ||
      "Donas frías en la oscuridad";

    document.title =
      siteTitle.textContent;

    loadProgress();

    determineCurrentLevel();

    render();

  }

  catch (error) {

    console.error(error);

    gameArea.innerHTML = `
      <div class="game-box">
        <div class="game-center">
          ERROR
        </div>
      </div>
    `;
  }
}


/* -------------------------
   LEVEL ID
------------------------- */

function getLevelId(level) {
  const raw =
    `${level.title}|${level.url}`;

  let hash = 0;

  for (
    let i = 0;
    i < raw.length;
    i += 1
  ) {

    hash =
      ((hash << 5) - hash) +
      raw.charCodeAt(i);

    hash |= 0;
  }

  return String(hash);
}


/* -------------------------
   PROGRESS
------------------------- */

function loadProgress() {
  try {

    const stored =
      JSON.parse(
        localStorage.getItem(
          STORAGE_KEY
        ) || "[]"
      );

    completed =
      new Set(
        Array.isArray(stored)
          ? stored.map(String)
          : []
      );

  }

  catch {

    completed =
      new Set();

  }
}


function saveProgress() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      [...completed]
    )
  );
}


function determineCurrentLevel() {
  const index =
    activeLevels.findIndex(
      level =>
        !completed.has(
          getLevelId(level)
        )
    );

  currentLevelIndex =
    index === -1
      ? activeLevels.length
      : index;
}


/* -------------------------
   MAIN RENDER
------------------------- */

function render() {
  cleanupGame();

  renderProgress();
  renderUnlocked();

  if (
    activeLevels.length === 0
  ) {

    gameArea.innerHTML = `
      <div class="game-box">
        <div class="game-center">
          <div class="game-name">
            SIN NIVELES
          </div>

          <p class="game-instruction">
            Todavía no hay nada por desbloquear.
          </p>
        </div>
      </div>
    `;

    return;
  }


  if (
    currentLevelIndex >=
    activeLevels.length
  ) {

    renderComplete();

    return;
  }


  renderLevelIntro(
    activeLevels[
      currentLevelIndex
    ],
    currentLevelIndex
  );
}


/* -------------------------
   PROGRESS HEADER
------------------------- */

function renderProgress() {
  const completedActive =
    activeLevels.filter(
      level =>
        completed.has(
          getLevelId(level)
        )
    ).length;

  progressText.textContent =
    `${String(completedActive)
      .padStart(2, "0")} / ${String(activeLevels.length)
      .padStart(2, "0")}`;
}


/* -------------------------
   INTRO
------------------------- */

function renderLevelIntro(
  level,
  index
) {

  gameArea.innerHTML = `
    <div class="level-header">

      <div class="level-number">
        NIVEL ${String(index + 1)
          .padStart(2, "0")}
      </div>

      <h2 class="level-title">
        ???
      </h2>

    </div>

    <div class="game-box">

      <div class="game-center">

        <div class="game-name">
          ${getGameDisplayName(level)}
        </div>

        <p class="game-instruction">
          Supera el minijuego para descubrir
          qué se esconde detrás de este nivel.
        </p>

        <button
          id="startGameButton"
          class="primary-button"
          type="button"
        >
          INICIAR
        </button>

      </div>

    </div>
  `;


  document
    .getElementById(
      "startGameButton"
    )
    .addEventListener(
      "click",
      () => {
        startGame(level);
      }
    );
}


/* -------------------------
   GAME SELECTION
------------------------- */

function startGame(level) {
  cleanupGame();

  let game =
    level.game || "random";

  if (game === "random") {
    game =
      selectRandomGame(level);
  }


  switch (game) {

    case "catch":
      startCatchGame(level);
      break;

    case "memory":
      startMemoryGame(level);
      break;

    case "reaction":
      startReactionGame(level);
      break;

    case "tap":
      startTapGame(level);
      break;

    case "sequence":
      startSequenceGame(level);
      break;

    default:
      startCatchGame(level);
      break;
  }
}


function selectRandomGame(level) {
  const games = [
    "catch",
    "memory",
    "reaction",
    "tap",
    "sequence"
  ];

  const seed =
    Math.abs(
      Number(
        getLevelId(level)
      )
    );

  return games[
    seed % games.length
  ];
}


function getGameDisplayName(
  level
) {

  const names = {
    catch: "ATRAPA LA DONA",
    memory: "MEMORIA",
    reaction: "REFLEJOS",
    tap: "NO PARES",
    sequence: "SECUENCIA",
    random: "MINIJUEGO ALEATORIO"
  };

  return (
    names[level.game] ||
    names.random
  );
}


/* -------------------------
   DIFFICULTY
------------------------- */

function difficultyValue(
  level,
  easy,
  normal,
  hard
) {

  switch (
    level.difficulty
  ) {

    case "easy":
      return easy;

    case "hard":
      return hard;

    default:
      return normal;
  }
}


/* =========================
   GAME 1: CATCH
========================= */

function startCatchGame(level) {

  const target =
    difficultyValue(
      level,
      6,
      9,
      13
    );

  const seconds =
    difficultyValue(
      level,
      15,
      13,
      11
    );

  let score = 0;
  let time = seconds;

  gameArea.innerHTML = `
    <div class="game-box">

      <div class="game-hud">
        <span>
          ${score}/${target}
        </span>

        <span id="catchTimer">
          ${time}s
        </span>
      </div>

      <div
        id="catchZone"
        class="catch-zone"
      >

        <button
          id="donutTarget"
          class="donut-target"
          type="button"
        >
          ◎
        </button>

      </div>

    </div>
  `;


  const zone =
    document.getElementById(
      "catchZone"
    );

  const donut =
    document.getElementById(
      "donutTarget"
    );


  function moveDonut() {

    const maxX =
      Math.max(
        0,
        zone.clientWidth -
        donut.offsetWidth -
        8
      );

    const maxY =
      Math.max(
        0,
        zone.clientHeight -
        donut.offsetHeight -
        8
      );

    donut.style.left =
      `${Math.random() * maxX}px`;

    donut.style.top =
      `${Math.random() * maxY}px`;
  }


  function updateScore() {
    const hud =
      gameArea.querySelector(
        ".game-hud span"
      );

    if (hud) {
      hud.textContent =
        `${score}/${target}`;
    }
  }


  donut.addEventListener(
    "click",
    () => {

      score += 1;

      updateScore();

      if (score >= target) {
        winLevel(level);
        return;
      }

      moveDonut();
    }
  );


  moveDonut();


  const timer =
    setInterval(
      () => {

        time -= 1;

        const timerText =
          document.getElementById(
            "catchTimer"
          );

        if (timerText) {
          timerText.textContent =
            `${time}s`;
        }

        if (time <= 0) {

          clearInterval(timer);

          failGame(level);

        }

      },
      1000
    );


  gameCleanup =
    () => clearInterval(timer);
}


/* =========================
   GAME 2: TAP
========================= */

function startTapGame(level) {

  const required =
    difficultyValue(
      level,
      20,
      30,
      42
    );

  const seconds =
    difficultyValue(
      level,
      10,
      9,
      8
    );

  let count = 0;
  let time = seconds;


  gameArea.innerHTML = `
    <div class="game-box">

      <div class="game-hud">
        <span>
          META ${required}
        </span>

        <span id="tapTimer">
          ${time}s
        </span>
      </div>

      <div class="game-center">

        <button
          id="tapButton"
          class="tap-button"
          type="button"
        >
          ◎
        </button>

        <div
          id="tapCount"
          class="tap-count"
        >
          0
        </div>

      </div>

    </div>
  `;


  const button =
    document.getElementById(
      "tapButton"
    );

  const countDisplay =
    document.getElementById(
      "tapCount"
    );


  button.addEventListener(
    "click",
    () => {

      count += 1;

      countDisplay.textContent =
        count;

      if (count >= required) {
        winLevel(level);
      }

    }
  );


  const timer =
    setInterval(
      () => {

        time -= 1;

        const display =
          document.getElementById(
            "tapTimer"
          );

        if (display) {
          display.textContent =
            `${time}s`;
        }

        if (time <= 0) {

          clearInterval(timer);

          if (
            count < required
          ) {
            failGame(level);
          }

        }

      },
      1000
    );


  gameCleanup =
    () => clearInterval(timer);
}


/* =========================
   GAME 3: REACTION
========================= */

function startReactionGame(level) {

  const requiredMs =
    difficultyValue(
      level,
      650,
      500,
      380
    );

  let ready = false;
  let finished = false;
  let startTime = 0;


  gameArea.innerHTML = `
    <div class="game-box">

      <button
        id="reactionZone"
        class="reaction-zone"
        type="button"
      >
        Espera...
      </button>

    </div>
  `;


  const zone =
    document.getElementById(
      "reactionZone"
    );


  const delay =
    1800 +
    Math.random() * 2600;


  const timeout =
    setTimeout(
      () => {

        ready = true;

        startTime =
          performance.now();

        zone.classList.add(
          "ready"
        );

        zone.textContent =
          "¡AHORA!";

      },
      delay
    );


  zone.addEventListener(
    "click",
    () => {

      if (finished) {
        return;
      }


      if (!ready) {

        finished = true;

        clearTimeout(timeout);

        showToast(
          "demasiado pronto"
        );

        setTimeout(
          () => failGame(level),
          450
        );

        return;
      }


      finished = true;

      const reaction =
        Math.round(
          performance.now() -
          startTime
        );


      if (
        reaction <= requiredMs
      ) {

        showToast(
          `${reaction} ms`
        );

        setTimeout(
          () => winLevel(level),
          400
        );

      }

      else {

        showToast(
          `${reaction} ms`
        );

        setTimeout(
          () => failGame(level),
          650
        );

      }

    }
  );


  gameCleanup =
    () => clearTimeout(timeout);
}


/* =========================
   GAME 4: MEMORY
========================= */

function startMemoryGame(level) {

  const pairCount =
    difficultyValue(
      level,
      3,
      4,
      6
    );

  const symbols = [
    "●",
    "▲",
    "■",
    "◆",
    "✦",
    "☾",
    "◎",
    "◇"
  ];


  const selected =
    symbols.slice(
      0,
      pairCount
    );


  const cards =
    shuffle(
      [
        ...selected,
        ...selected
      ]
    );


  let first = null;
  let second = null;

  let locked = false;
  let matches = 0;


  gameArea.innerHTML = `
    <div class="game-box">

      <div class="game-center">

        <div class="game-name">
          ENCUENTRA LAS PAREJAS
        </div>

        <div
          id="memoryGrid"
          class="memory-grid"
        ></div>

      </div>

    </div>
  `;


  const grid =
    document.getElementById(
      "memoryGrid"
    );


  cards.forEach(
    (symbol, index) => {

      const button =
        document.createElement(
          "button"
        );

      button.type =
        "button";

      button.className =
        "memory-card";

      button.dataset.symbol =
        symbol;

      button.dataset.index =
        index;

      button.textContent =
        symbol;


      button.addEventListener(
        "click",
        () => {

          if (
            locked ||
            button.classList.contains(
              "open"
            ) ||
            button.classList.contains(
              "matched"
            )
          ) {
            return;
          }


          button.classList.add(
            "open"
          );


          if (!first) {

            first =
              button;

            return;
          }


          second =
            button;

          locked = true;


          if (
            first.dataset.symbol ===
            second.dataset.symbol
          ) {

            first.classList.add(
              "matched"
            );

            second.classList.add(
              "matched"
            );

            first.classList.remove(
              "open"
            );

            second.classList.remove(
              "open"
            );

            matches += 1;

            first = null;
            second = null;
            locked = false;


            if (
              matches >=
              pairCount
            ) {

              setTimeout(
                () => winLevel(level),
                300
              );

            }

          }

          else {

            setTimeout(
              () => {

                first.classList.remove(
                  "open"
                );

                second.classList.remove(
                  "open"
                );

                first = null;
                second = null;
                locked = false;

              },
              650
            );

          }

        }
      );


      grid.appendChild(
        button
      );

    }
  );
}


/* =========================
   GAME 5: SEQUENCE
========================= */

function startSequenceGame(level) {

  const sequenceLength =
    difficultyValue(
      level,
      3,
      5,
      7
    );

  let sequence = [];

  let userIndex = 0;
  let accepting = false;


  gameArea.innerHTML = `
    <div class="game-box">

      <div class="game-center">

        <div class="game-name">
          MEMORIZA LA SECUENCIA
        </div>

        <div
          id="sequenceGrid"
          class="sequence-grid"
        >

          <button
            class="sequence-button"
            data-value="0"
            type="button"
          >
            1
          </button>

          <button
            class="sequence-button"
            data-value="1"
            type="button"
          >
            2
          </button>

          <button
            class="sequence-button"
            data-value="2"
            type="button"
          >
            3
          </button>

          <button
            class="sequence-button"
            data-value="3"
            type="button"
          >
            4
          </button>

        </div>

      </div>

    </div>
  `;


  const buttons =
    Array.from(
      document.querySelectorAll(
        ".sequence-button"
      )
    );


  for (
    let i = 0;
    i < sequenceLength;
    i += 1
  ) {

    sequence.push(
      Math.floor(
        Math.random() * 4
      )
    );

  }


  buttons.forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          if (!accepting) {
            return;
          }

          const value =
            Number(
              button.dataset.value
            );


          flashSequenceButton(
            button
          );


          if (
            value !==
            sequence[userIndex]
          ) {

            accepting = false;

            failGame(level);

            return;
          }


          userIndex += 1;


          if (
            userIndex >=
            sequence.length
          ) {

            accepting = false;

            setTimeout(
              () => winLevel(level),
              250
            );

          }

        }
      );

    }
  );


  setTimeout(
    async () => {

      for (
        const value of sequence
      ) {

        const button =
          buttons[value];

        button.classList.add(
          "active"
        );

        await wait(400);

        button.classList.remove(
          "active"
        );

        await wait(220);
      }

      accepting = true;

    },
    700
  );
}


/* -------------------------
   WIN
------------------------- */

function winLevel(level) {
  cleanupGame();

  const id =
    getLevelId(level);

  completed.add(id);

  saveProgress();

  renderProgress();
  renderUnlocked();


  gameArea.innerHTML = `
    <div class="game-box">

      <div class="win-screen">

        <div class="win-mark">
          ✦
        </div>

        <h2>
          NIVEL SUPERADO
        </h2>

        <div class="unlock-title"></div>

        <div class="win-actions">

          <a
            id="openUnlockedLink"
            class="primary-button"
            target="_blank"
            rel="noopener noreferrer"
          >
            ABRIR ↗
          </a>

          <button
            id="continueButton"
            class="secondary-button"
            type="button"
          >
            CONTINUAR
          </button>

        </div>

      </div>

    </div>
  `;


  gameArea
    .querySelector(
      ".unlock-title"
    )
    .textContent =
      level.title;


  document
    .getElementById(
      "openUnlockedLink"
    )
    .href =
      normalizeUrl(
        level.url
      );


  document
    .getElementById(
      "continueButton"
    )
    .addEventListener(
      "click",
      () => {

        determineCurrentLevel();

        render();

      }
    );
}


/* -------------------------
   FAIL
------------------------- */

function failGame(level) {
  cleanupGame();

  gameArea.innerHTML = `
    <div class="game-box">

      <div class="game-center">

        <div class="game-name">
          INTENTO FALLIDO
        </div>

        <p class="game-instruction">
          La oscuridad ganó esta vez.
        </p>

        <button
          id="retryButton"
          class="secondary-button"
          type="button"
        >
          REINTENTAR
        </button>

      </div>

    </div>
  `;


  document
    .getElementById(
      "retryButton"
    )
    .addEventListener(
      "click",
      () => {

        startGame(level);

      }
    );
}


/* -------------------------
   COMPLETE
------------------------- */

function renderComplete() {

  gameArea.innerHTML = `
    <div class="game-box">

      <div class="game-center">

        <div class="game-name">
          ARCHIVO COMPLETO
        </div>

        <p class="game-instruction">
          Has desbloqueado todo lo que
          actualmente se encuentra disponible.
        </p>

        <div style="
          font-size:2rem;
          margin-top:10px;
        ">
          ◎
        </div>

      </div>

    </div>
  `;
}


/* -------------------------
   UNLOCKED LINKS
------------------------- */

function renderUnlocked() {

  const unlocked =
    activeLevels.filter(
      level =>
        completed.has(
          getLevelId(level)
        )
    );


  unlockedArea.innerHTML =
    "";


  if (
    unlocked.length === 0
  ) {
    return;
  }


  const heading =
    document.createElement(
      "div"
    );

  heading.className =
    "unlocked-heading";

  heading.textContent =
    "DESBLOQUEADO";


  const list =
    document.createElement(
      "div"
    );

  list.className =
    "unlocked-list";


  unlocked.forEach(
    level => {

      const link =
        document.createElement(
          "a"
        );

      link.className =
        "unlocked-link";

      link.href =
        normalizeUrl(
          level.url
        );

      link.target =
        "_blank";

      link.rel =
        "noopener noreferrer";


      const title =
        document.createElement(
          "span"
        );

      title.textContent =
        level.title;


      const arrow =
        document.createElement(
          "span"
        );

      arrow.className =
        "unlocked-arrow";

      arrow.textContent =
        "↗";


      link.append(
        title,
        arrow
      );

      list.appendChild(
        link
      );

    }
  );


  unlockedArea.append(
    heading,
    list
  );
}


/* -------------------------
   CLEANUP
------------------------- */

function cleanupGame() {

  if (
    typeof gameCleanup ===
    "function"
  ) {

    gameCleanup();

  }

  gameCleanup = null;
}


/* -------------------------
   HELPERS
------------------------- */

function normalizeUrl(value) {

  const url =
    String(
      value || ""
    ).trim();


  if (!url) {
    return "#";
  }


  if (
    /^(https?:\/\/|mailto:|tel:)/i
      .test(url)
  ) {

    return url;

  }


  return `https://${url}`;
}


function shuffle(array) {

  const copy =
    [...array];


  for (
    let i =
      copy.length - 1;

    i > 0;

    i -= 1
  ) {

    const j =
      Math.floor(
        Math.random() *
        (i + 1)
      );


    [
      copy[i],
      copy[j]
    ] = [
      copy[j],
      copy[i]
    ];

  }


  return copy;
}


function flashSequenceButton(
  button
) {

  button.classList.add(
    "active"
  );

  setTimeout(
    () => {

      button.classList.remove(
        "active"
      );

    },
    160
  );
}


function wait(ms) {

  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
  );
}


/* -------------------------
   TOAST
------------------------- */

let toastTimeout = null;

function showToast(text) {

  clearTimeout(
    toastTimeout
  );

  toast.textContent =
    text;

  toast.classList.add(
    "show"
  );


  toastTimeout =
    setTimeout(
      () => {

        toast.classList.remove(
          "show"
        );

      },
      1500
    );
}


/* -------------------------
   RESET
------------------------- */

resetButton.addEventListener(
  "click",
  () => {

    const confirmed =
      window.confirm(
        "¿Reiniciar todo el progreso?"
      );


    if (!confirmed) {
      return;
    }


    cleanupGame();

    completed.clear();

    localStorage.removeItem(
      STORAGE_KEY
    );

    currentLevelIndex = 0;

    render();

  }
);


/* -------------------------
   START
------------------------- */

init();
