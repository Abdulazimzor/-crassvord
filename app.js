/**
 * ============================================================================
 * INTERAKTIV KROSSVORD — ZAMONAVIY VA RESPONSIBIL WEB ILOVA
 * Til: O'zbek tili (Lotin yozuvida)
 * Texnologiya: Vanilla JavaScript (ES6+), Web Audio API, Canvas Confetti
 * ============================================================================
 */

(() => {
  'use strict';

  // --- 1. Krossvord Ma'lumotlari (7x7 Matematik Aniq Koordinatalar) ---
  const GRID_SIZE = 7;

  /**
   * 5 ta kesishuvchi so'zlar:
   * 1-Across: O L M A (Row 1, Cols 1..4)
   * 2-Down:   O L T I N (Row 1..5, Col 1) -> Kesishish: (1,1) 'O'
   * 3-Across: T O P L A M (Row 3, Cols 1..6) -> Kesishish: (3,1) 'T'
   * 4-Down:   P A L T O (Row 3..7, Col 3) -> Kesishish: (3,3) 'P'
   * 5-Across: O R O M (Row 7, Cols 1..4) -> Kesishish: (7,3) 'O'
   */
  const WORDS = [
    {
      id: '1-across',
      number: 1,
      direction: 'across',
      answer: 'OLMA',
      clue: 'Shirin, vitaminlarga boy mashhur meva',
      start: { row: 1, col: 1 },
      length: 4
    },
    {
      id: '2-down',
      number: 2,
      direction: 'down',
      answer: 'OLTIN',
      clue: 'Qimmatbaho sariq metall, zargarlik boyligi',
      start: { row: 1, col: 1 },
      length: 5
    },
    {
      id: '3-across',
      number: 3,
      direction: 'across',
      answer: 'TOPLAM',
      clue: 'Bir xil belgiga ega narsalar yig‘indisi, majmuasi',
      start: { row: 3, col: 1 },
      length: 6
    },
    {
      id: '4-down',
      number: 4,
      direction: 'down',
      answer: 'PALTO',
      clue: 'Sovuq mavsumda kiyiladigan qalin ustki kiyim',
      start: { row: 3, col: 3 },
      length: 5
    },
    {
      id: '5-across',
      number: 5,
      direction: 'across',
      answer: 'OROM',
      clue: 'Tinchlik, sokinlik va hordiq holati',
      start: { row: 7, col: 1 },
      length: 4
    }
  ];

  // Matritsadagi har bir katakcha modeli
  // cellKey: "r-c" (masalan "1-1")
  const cellMap = new Map();

  // Katakcha ma'lumotlarini hisoblash
  WORDS.forEach(word => {
    for (let i = 0; i < word.length; i++) {
      const r = word.direction === 'across' ? word.start.row : word.start.row + i;
      const c = word.direction === 'across' ? word.start.col + i : word.start.col;
      const key = `${r}-${c}`;
      const letter = word.answer[i];

      if (!cellMap.has(key)) {
        cellMap.set(key, {
          row: r,
          col: c,
          correctLetter: letter,
          number: null,
          words: []
        });
      }

      const cellData = cellMap.get(key);
      cellData.words.push(word.id);

      // Agar bu so'zning boshlang'ich katakchasi bo'lsa raqamini belgilash
      if (i === 0) {
        if (!cellData.number) {
          cellData.number = word.number;
        } else {
          // Bir nechta so'z shu katakdan boshlansa (masalan 1 va 2)
          cellData.number = `${cellData.number}, ${word.number}`;
        }
      }
    }
  });

  const TOTAL_ACTIVE_CELLS = cellMap.size; // 20 ta harf katakchasi

  // --- 2. O'yin Holati (Game State) ---
  const state = {
    activeCell: { row: 1, col: 1 },
    activeDirection: 'across',
    activeWordId: '1-across',
    timerSeconds: 0,
    timerInterval: null,
    isTimerRunning: false,
    soundEnabled: true,
    theme: 'dark',
    isGameSolved: false,
    letterHintsRemaining: 3, // Maksimal 3 marta harf ochish
    wordHintsRemaining: 1    // Faqat 1 marta butun so'zni ochish
  };

  // --- 3. DOM Elementlari ---
  const gridContainer = document.getElementById('crossword-grid');
  const acrossCluesList = document.getElementById('across-clues-list');
  const downCluesList = document.getElementById('down-clues-list');
  const activeClueBadge = document.getElementById('active-clue-badge');
  const activeClueText = document.getElementById('active-clue-text');
  const timerDisplay = document.getElementById('timer-display');
  const progressText = document.getElementById('progress-text');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const correctWordsCount = document.getElementById('correct-words-count');
  const toastNotification = document.getElementById('toast-notification');

  // Tugmalar va hisoblagichlar
  const checkBtn = document.getElementById('check-btn');
  const hintBtn = document.getElementById('hint-btn');
  const hintCounter = document.getElementById('hint-counter');
  const revealWordBtn = document.getElementById('reveal-word-btn');
  const wordCounter = document.getElementById('word-counter');
  const resetBtn = document.getElementById('reset-btn');
  const soundBtn = document.getElementById('sound-btn');
  const soundIconOn = document.getElementById('sound-icon-on');
  const soundIconOff = document.getElementById('sound-icon-off');
  const themeBtn = document.getElementById('theme-btn');
  const themeIconSun = document.getElementById('theme-icon-sun');
  const themeIconMoon = document.getElementById('theme-icon-moon');
  const helpBtn = document.getElementById('help-btn');
  const printBtn = document.getElementById('print-btn');
  const showSolutionBtn = document.getElementById('show-solution-btn');

  // Modallar
  const victoryModal = document.getElementById('victory-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalRestartBtn = document.getElementById('modal-restart-btn');
  const modalScore = document.getElementById('modal-score');
  const modalTime = document.getElementById('modal-time');
  const helpModal = document.getElementById('help-modal');
  const helpCloseBtn = document.getElementById('help-close-btn');
  const helpCloseX = document.getElementById('help-close-x');
  const confirmModal = document.getElementById('confirm-modal');
  const confirmYesBtn = document.getElementById('confirm-yes-btn');
  const confirmNoBtn = document.getElementById('confirm-no-btn');

  // Canvas
  const confettiCanvas = document.getElementById('confetti-canvas');
  let confettiCtx = confettiCanvas.getContext('2d');
  let confettiAnimationId = null;
  let particles = [];

  // --- 4. Web Audio API Ovoz Sintezi ---
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playSound(type) {
    if (!state.soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;

      const now = audioCtx.currentTime;

      if (type === 'type') {
        // Yumshoq klaviatura chertishi
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.04);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === 'select') {
        // Tanlash sadosi
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(580, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
      } else if (type === 'correct') {
        // To'g'ri so'z chiroyli ohang
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          const startTime = now + idx * 0.07;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.12, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.25);
        });
      } else if (type === 'error') {
        // Xato sadosi
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.18);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'hint') {
        // Maslahat/ochish ohangi
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.15);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'victory') {
        // G'alaba tantanasi (Fanfare)
        const fanfareNotes = [
          { f: 523.25, d: 0.15, t: 0.00 },
          { f: 659.25, d: 0.15, t: 0.15 },
          { f: 783.99, d: 0.18, t: 0.30 },
          { f: 1046.50, d: 0.45, t: 0.48 }
        ];
        fanfareNotes.forEach(note => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          const startTime = now + note.t;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(note.f, startTime);
          gain.gain.setValueAtTime(0.18, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + note.d);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(startTime);
          osc.stop(startTime + note.d);
        });
      }
    } catch (e) {
      console.warn('Audio xatosi:', e);
    }
  }

  // --- 5. Toast Xabarnomasi ---
  let toastTimeout = null;
  function showToast(message, type = 'info') {
    if (toastTimeout) clearTimeout(toastTimeout);

    toastNotification.textContent = message;
    toastNotification.className = `toast-notification show toast-${type}`;

    toastTimeout = setTimeout(() => {
      toastNotification.classList.remove('show');
    }, 2800);
  }

  // --- 6. Taymer Funksiyalari ---
  function startTimer() {
    if (state.isTimerRunning) return;
    state.isTimerRunning = true;
    state.timerInterval = setInterval(() => {
      state.timerSeconds++;
      updateTimerDisplay();
    }, 1000);
  }

  function stopTimer() {
    state.isTimerRunning = false;
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
  }

  function resetTimer() {
    stopTimer();
    state.timerSeconds = 0;
    updateTimerDisplay();
  }

  function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function updateTimerDisplay() {
    timerDisplay.textContent = formatTime(state.timerSeconds);
  }

  // --- 7. Matritsa va Savollarni Chizish (Render) ---
  function renderGrid() {
    gridContainer.innerHTML = '';

    for (let r = 1; r <= GRID_SIZE; r++) {
      for (let c = 1; c <= GRID_SIZE; c++) {
        const key = `${r}-${c}`;
        const cellInfo = cellMap.get(key);
        const cellEl = document.createElement('div');
        cellEl.dataset.row = r;
        cellEl.dataset.col = c;

        if (cellInfo) {
          // Faol katakcha (harf yoziladigan joy)
          cellEl.className = 'grid-cell cell-active-tile';
          cellEl.dataset.key = key;

          // Agar raqam bo'lsa
          if (cellInfo.number) {
            const numEl = document.createElement('span');
            numEl.className = 'cell-num';
            numEl.textContent = cellInfo.number;
            cellEl.appendChild(numEl);
          }

          // Harf kiritish uchun input elementi
          const inputEl = document.createElement('input');
          inputEl.type = 'text';
          inputEl.className = 'cell-input';
          inputEl.maxLength = 1;
          inputEl.autocomplete = 'off';
          inputEl.autocapitalize = 'characters';
          inputEl.spellcheck = false;
          inputEl.dataset.row = r;
          inputEl.dataset.col = c;
          inputEl.setAttribute('aria-label', `Katakcha: Qator ${r}, Ustun ${c}`);

          // Hodisalar
          inputEl.addEventListener('focus', () => onCellFocus(r, c));
          inputEl.addEventListener('click', (e) => onCellClick(r, c, e));
          inputEl.addEventListener('input', (e) => onCellInput(r, c, e));
          inputEl.addEventListener('keydown', (e) => onCellKeyDown(r, c, e));

          cellEl.appendChild(inputEl);
        } else {
          // Nofaol qora katakcha
          cellEl.className = 'grid-cell cell-inactive';
          cellEl.setAttribute('aria-hidden', 'true');
        }

        gridContainer.appendChild(cellEl);
      }
    }
  }

  function renderClues() {
    acrossCluesList.innerHTML = '';
    downCluesList.innerHTML = '';

    WORDS.forEach(word => {
      const clueItem = document.createElement('div');
      clueItem.className = 'clue-item';
      clueItem.dataset.wordId = word.id;
      clueItem.id = `clue-${word.id}`;

      clueItem.innerHTML = `
        <span class="clue-item-number">${word.number}</span>
        <div class="clue-item-content">
          <p class="clue-item-text">${word.clue}</p>
          <div class="clue-item-meta">
            <span class="clue-item-len">${word.length} ta harf</span>
          </div>
        </div>
        <div class="clue-solved-icon hidden">
          <svg class="icon-small" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
      `;

      clueItem.addEventListener('click', () => {
        selectWord(word.id);
        playSound('select');
      });

      if (word.direction === 'across') {
        acrossCluesList.appendChild(clueItem);
      } else {
        downCluesList.appendChild(clueItem);
      }
    });
  }

  // --- 8. Navigatsiya va Tanlash Mantiqi ---
  function getCellInput(r, c) {
    return gridContainer.querySelector(`.cell-input[data-row="${r}"][data-col="${c}"]`);
  }

  function getCellTile(r, c) {
    return gridContainer.querySelector(`.cell-active-tile[data-row="${r}"][data-col="${c}"]`);
  }

  function getWordById(id) {
    return WORDS.find(w => w.id === id);
  }

  function getWordCells(word) {
    const cells = [];
    for (let i = 0; i < word.length; i++) {
      const r = word.direction === 'across' ? word.start.row : word.start.row + i;
      const c = word.direction === 'across' ? word.start.col + i : word.start.col;
      cells.push({ row: r, col: c });
    }
    return cells;
  }

  function onCellClick(r, c, event) {
    const isSameCell = state.activeCell && state.activeCell.row === r && state.activeCell.col === c;
    const cellData = cellMap.get(`${r}-${c}`);

    if (isSameCell && cellData && cellData.words.length > 1) {
      // Katakcha ikkita so'z kesishgan joyi bo'lsa, yo'nalishni almashtirish
      toggleDirection();
      playSound('select');
    } else {
      updateActiveWordForCell(r, c);
    }
  }

  function onCellFocus(r, c) {
    startTimer();
    state.activeCell = { row: r, col: c };
    updateActiveWordForCell(r, c);
  }

  function updateActiveWordForCell(r, c) {
    const cellData = cellMap.get(`${r}-${c}`);
    if (!cellData) return;

    // Agar joriy yo'nalish shu katakchaga mos kelsa, o'shani qoldirish
    let matchingWord = cellData.words.find(wId => {
      const w = getWordById(wId);
      return w && w.direction === state.activeDirection;
    });

    // Agar mos kelmasa, birinchi mavjud so'zga o'tkazish
    if (!matchingWord) {
      matchingWord = cellData.words[0];
      const w = getWordById(matchingWord);
      if (w) state.activeDirection = w.direction;
    }

    state.activeWordId = matchingWord;
    highlightBoard();
  }

  function toggleDirection() {
    const cellData = cellMap.get(`${state.activeCell.row}-${state.activeCell.col}`);
    if (!cellData || cellData.words.length <= 1) return;

    state.activeDirection = state.activeDirection === 'across' ? 'down' : 'across';
    
    // Yangi yo'nalishdagi so'zni topish
    const wordId = cellData.words.find(wId => {
      const w = getWordById(wId);
      return w && w.direction === state.activeDirection;
    });

    if (wordId) {
      state.activeWordId = wordId;
    }

    highlightBoard();
  }

  function selectWord(wordId, targetCell = null) {
    const word = getWordById(wordId);
    if (!word) return;

    state.activeWordId = word.id;
    state.activeDirection = word.direction;

    // Agar maqsadli katak ko'rsatilmagan bo'lsa, birinchi to'ldirilmagan katakni topish
    if (!targetCell) {
      const cells = getWordCells(word);
      const emptyCell = cells.find(c => {
        const input = getCellInput(c.row, c.col);
        return input && input.value.trim() === '';
      });
      targetCell = emptyCell || cells[0];
    }

    state.activeCell = targetCell;
    const input = getCellInput(targetCell.row, targetCell.col);
    if (input) {
      input.focus();
      input.select();
    }

    // Mobil qurilmalarda krossvord doskasini ko'rish maydoniga yumshoq keltirish
    if (window.innerWidth <= 768) {
      gridContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    highlightBoard();
  }

  function highlightBoard() {
    // 1. Barcha katakchalarning eski holatini tozalash
    document.querySelectorAll('.cell-active-tile').forEach(tile => {
      tile.classList.remove('cell-in-word', 'cell-focused');
    });

    // 2. Faol so'z katakchalarini bo'yash
    const currentWord = getWordById(state.activeWordId);
    if (currentWord) {
      const cells = getWordCells(currentWord);
      cells.forEach(c => {
        const tile = getCellTile(c.row, c.col);
        if (tile) tile.classList.add('cell-in-word');
      });

      // Banner ma'lumotini yangilash
      activeClueBadge.textContent = `${currentWord.number}-${currentWord.direction === 'across' ? 'Gorizontal' : 'Vertikal'}`;
      activeClueText.textContent = `${currentWord.clue} (${currentWord.length} ta harf)`;
    }

    // 3. Tanlangan fokusdagi katakchani ajratib ko'rsatish
    if (state.activeCell) {
      const activeTile = getCellTile(state.activeCell.row, state.activeCell.col);
      if (activeTile) activeTile.classList.add('cell-focused');
    }

    // 4. Savollar ro'yxatida faol savolni belgilash
    document.querySelectorAll('.clue-item').forEach(item => {
      item.classList.remove('active');
    });
    if (state.activeWordId) {
      const activeClueItem = document.getElementById(`clue-${state.activeWordId}`);
      if (activeClueItem) {
        activeClueItem.classList.add('active');
        activeClueItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }

  // --- 9. Klaviaturadan Kiritish va Avtomatik Harakatlanish ---
  function onCellInput(r, c, event) {
    const input = event.target;
    let val = input.value;

    if (!val) {
      updateProgress();
      saveProgressToStorage();
      return;
    }

    // Lotin harflariga normallashtirish va bosh harf qilish
    val = val.toUpperCase().slice(-1);
    input.value = val;

    // Tekshirish ranglarini tozalash
    const tile = getCellTile(r, c);
    if (tile) {
      tile.classList.remove('cell-incorrect', 'cell-correct');
    }

    playSound('type');
    updateProgress();
    saveProgressToStorage();

    // Avtomatik ravishda keyingi katakchaga o'tish
    moveToNextCell(r, c);
  }

  function moveToNextCell(r, c) {
    const word = getWordById(state.activeWordId);
    if (!word) return;

    const cells = getWordCells(word);
    const currentIndex = cells.findIndex(item => item.row === r && item.col === c);

    if (currentIndex !== -1 && currentIndex < cells.length - 1) {
      const nextCell = cells[currentIndex + 1];
      const nextInput = getCellInput(nextCell.row, nextCell.col);
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }
  }

  function moveToPrevCell(r, c) {
    const word = getWordById(state.activeWordId);
    if (!word) return;

    const cells = getWordCells(word);
    const currentIndex = cells.findIndex(item => item.row === r && item.col === c);

    if (currentIndex > 0) {
      const prevCell = cells[currentIndex - 1];
      const prevInput = getCellInput(prevCell.row, prevCell.col);
      if (prevInput) {
        prevInput.focus();
        prevInput.select();
      }
    }
  }

  function onCellKeyDown(r, c, event) {
    const input = event.target;

    switch (event.key) {
      case 'Backspace':
        if (input.value === '') {
          event.preventDefault();
          moveToPrevCell(r, c);
          const prevCellInput = document.activeElement;
          if (prevCellInput && prevCellInput.classList.contains('cell-input')) {
            prevCellInput.value = '';
            const pTile = getCellTile(prevCellInput.dataset.row, prevCellInput.dataset.col);
            if (pTile) pTile.classList.remove('cell-incorrect', 'cell-correct');
            updateProgress();
            saveProgressToStorage();
          }
        } else {
          // Harf o'chiriladi, keyin o'sha joyda turadi
          input.value = '';
          const tile = getCellTile(r, c);
          if (tile) tile.classList.remove('cell-incorrect', 'cell-correct');
          updateProgress();
          saveProgressToStorage();
        }
        break;

      case ' ': // Spacebar - yo'nalishni o'zgartirish
        event.preventDefault();
        toggleDirection();
        playSound('select');
        break;

      case 'ArrowRight':
        event.preventDefault();
        navigateGrid(r, c + 1, 'right');
        break;

      case 'ArrowLeft':
        event.preventDefault();
        navigateGrid(r, c - 1, 'left');
        break;

      case 'ArrowDown':
        event.preventDefault();
        navigateGrid(r + 1, c, 'down');
        break;

      case 'ArrowUp':
        event.preventDefault();
        navigateGrid(r - 1, c, 'up');
        break;

      case 'Enter':
        event.preventDefault();
        checkAnswers();
        break;
    }
  }

  function navigateGrid(nextR, nextC, dir) {
    // Matritsa chegarasidan chiqmaslik
    if (nextR < 1 || nextR > GRID_SIZE || nextC < 1 || nextC > GRID_SIZE) return;

    // Agar maqsadli katak faol bo'lsa
    if (cellMap.has(`${nextR}-${nextC}`)) {
      const nextInput = getCellInput(nextR, nextC);
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    } else {
      // Agar bo'sh katak bo'lsa, o'sha yo'nalishdagi keyingi faol katakchani izlash
      let curR = nextR;
      let curC = nextC;
      while (curR >= 1 && curR <= GRID_SIZE && curC >= 1 && curC <= GRID_SIZE) {
        if (cellMap.has(`${curR}-${curC}`)) {
          const nextInput = getCellInput(curR, curC);
          if (nextInput) {
            nextInput.focus();
            nextInput.select();
            break;
          }
        }
        if (dir === 'right') curC++;
        else if (dir === 'left') curC--;
        else if (dir === 'down') curR++;
        else if (dir === 'up') curR--;
      }
    }
  }

  // --- 10. Tekshirish va Baholash (Validation) ---
  function checkAnswers() {
    startTimer();
    let correctCellsCount = 0;
    let incorrectCellsCount = 0;
    let emptyCellsCount = 0;
    let solvedWordsCount = 0;

    // 1. Har bir katakchani tekshirish
    cellMap.forEach((data, key) => {
      const input = getCellInput(data.row, data.col);
      const tile = getCellTile(data.row, data.col);
      if (!input || !tile) return;

      const userVal = input.value.trim().toUpperCase();

      tile.classList.remove('cell-correct', 'cell-incorrect');

      if (userVal === '') {
        emptyCellsCount++;
      } else if (userVal === data.correctLetter) {
        tile.classList.add('cell-correct');
        correctCellsCount++;
      } else {
        tile.classList.add('cell-incorrect');
        incorrectCellsCount++;
      }
    });

    // 2. Har bir so'zning to'liq yechilganligini tekshirish
    WORDS.forEach(word => {
      const cells = getWordCells(word);
      const isWordCorrect = cells.every(c => {
        const input = getCellInput(c.row, c.col);
        const data = cellMap.get(`${c.row}-${c.col}`);
        return input && data && input.value.trim().toUpperCase() === data.correctLetter;
      });

      const clueEl = document.getElementById(`clue-${word.id}`);
      if (clueEl) {
        const checkIcon = clueEl.querySelector('.clue-solved-icon');
        if (isWordCorrect) {
          clueEl.classList.add('solved');
          if (checkIcon) checkIcon.classList.remove('hidden');
          solvedWordsCount++;
        } else {
          clueEl.classList.remove('solved');
          if (checkIcon) checkIcon.classList.add('hidden');
        }
      }
    });

    correctWordsCount.textContent = solvedWordsCount;

    // 3. Natijaga qarab foydalanuvchiga ovoz va xabar berish
    if (correctCellsCount === TOTAL_ACTIVE_CELLS && solvedWordsCount === WORDS.length) {
      // 100% To'liq g'alaba!
      state.isGameSolved = true;
      stopTimer();
      playSound('victory');
      triggerConfetti();
      showVictoryModal(solvedWordsCount);
      showToast("Tabriklaymiz! 5/5 so'z to'g'ri topildi! Barakalla!", "success");
    } else if (incorrectCellsCount > 0) {
      playSound('error');
      showToast(`Xatolar mavjud: qizil bilan belgilangan katakchalarni qayta tekshiring!`, 'error');
    } else if (emptyCellsCount > 0 && correctCellsCount > 0) {
      playSound('correct');
      showToast(`Ajoyib! Hozirgacha yozilgan ${correctCellsCount} ta harf to'g'ri. Davom eting!`, 'success');
    } else if (emptyCellsCount === TOTAL_ACTIVE_CELLS) {
      showToast("Iltimos, avval krossvord katakchalarini to'ldiring!", 'info');
    }
  }

  // --- 11. Yordam Funksiyalari (Hints & Reveal Limitlar bilan) ---
  function updateHintBadges() {
    if (hintCounter) {
      hintCounter.textContent = `${state.letterHintsRemaining}/3`;
    }
    if (wordCounter) {
      wordCounter.textContent = `${state.wordHintsRemaining}/1`;
    }

    if (hintBtn) {
      if (state.letterHintsRemaining <= 0) {
        hintBtn.classList.add('btn-exhausted');
        hintBtn.setAttribute('title', 'Harf ochish imkoniyati tugadi (3/3 ishlatildi)');
      } else {
        hintBtn.classList.remove('btn-exhausted');
        hintBtn.setAttribute('title', `Tanlangan katakdagi harfni ochish (${state.letterHintsRemaining} ta qoldi)`);
      }
    }

    if (revealWordBtn) {
      if (state.wordHintsRemaining <= 0) {
        revealWordBtn.classList.add('btn-exhausted');
        revealWordBtn.setAttribute('title', 'So\'z ochish imkoniyati tugadi (1/1 ishlatildi)');
      } else {
        revealWordBtn.classList.remove('btn-exhausted');
        revealWordBtn.setAttribute('title', 'Butun so\'zni ko\'rsatish (faqat 1 marta mumkin)');
      }
    }
  }

  function revealCurrentCell() {
    // 1. Cheklovni tekshirish: faqat 3 marta mumkin
    if (state.letterHintsRemaining <= 0) {
      playSound('error');
      showToast("Harf ochish imkoniyati tugadi (maksimal 3 marta)!", 'error');
      return;
    }

    if (!state.activeCell) {
      // Agar tanlanmagan bo'lsa, birinchi bo'sh katakni topish
      let firstEmpty = null;
      for (const [key, data] of cellMap.entries()) {
        const inp = getCellInput(data.row, data.col);
        if (inp && inp.value.trim() === '') {
          firstEmpty = data;
          break;
        }
      }
      if (firstEmpty) {
        state.activeCell = { row: firstEmpty.row, col: firstEmpty.col };
        updateActiveWordForCell(firstEmpty.row, firstEmpty.col);
      } else {
        showToast("Barcha katakchalar to'ldirilgan!", 'info');
        return;
      }
    }

    const { row, col } = state.activeCell;
    const data = cellMap.get(`${row}-${col}`);
    const input = getCellInput(row, col);
    const tile = getCellTile(row, col);

    if (data && input && tile) {
      // Agar katakcha allaqachon to'g'ri bo'lsa
      if (input.value.trim().toUpperCase() === data.correctLetter) {
        showToast("Bu katakcha allaqachon to'g'ri to'ldirilgan!", 'info');
        moveToNextCell(row, col);
        return;
      }

      input.value = data.correctLetter;
      tile.classList.remove('cell-incorrect');
      tile.classList.add('cell-correct', 'cell-hinted');
      
      // Cheklovni bittaga kamaytirish
      state.letterHintsRemaining--;
      updateHintBadges();

      playSound('hint');
      showToast(`Harf ochildi: [${data.correctLetter}]. Qoldi: ${state.letterHintsRemaining} ta`, 'info');
      updateProgress();
      saveProgressToStorage();
      moveToNextCell(row, col);
    }
  }

  function revealCurrentWord() {
    // 1. Cheklovni tekshirish: faqat 1 marta mumkin!
    if (state.wordHintsRemaining <= 0) {
      playSound('error');
      showToast("So'z ochish imkoniyati tugadi (faqat 1 marta mumkin edi)!", 'error');
      return;
    }

    const word = getWordById(state.activeWordId);
    if (!word) return;

    const cells = getWordCells(word);
    cells.forEach(c => {
      const data = cellMap.get(`${c.row}-${c.col}`);
      const input = getCellInput(c.row, c.col);
      const tile = getCellTile(c.row, c.col);
      if (data && input && tile) {
        input.value = data.correctLetter;
        tile.classList.remove('cell-incorrect');
        tile.classList.add('cell-correct', 'cell-hinted');
      }
    });

    // Cheklovni 0 ga tushirish
    state.wordHintsRemaining--;
    updateHintBadges();

    playSound('hint');
    showToast(`"${word.answer}" so'zi ochildi! So'z ochish imkoniyati tugadi.`, 'info');
    updateProgress();
    saveProgressToStorage();
    checkAnswers();
  }

  function revealFullSolution() {
    cellMap.forEach((data, key) => {
      const input = getCellInput(data.row, data.col);
      const tile = getCellTile(data.row, data.col);
      if (input && tile) {
        input.value = data.correctLetter;
        tile.classList.remove('cell-incorrect');
        tile.classList.add('cell-correct');
      }
    });

    updateProgress();
    saveProgressToStorage();
    checkAnswers();
  }

  function clearAllGrid() {
    cellMap.forEach((data, key) => {
      const input = getCellInput(data.row, data.col);
      const tile = getCellTile(data.row, data.col);
      if (input) input.value = '';
      if (tile) tile.classList.remove('cell-correct', 'cell-incorrect', 'cell-hinted');
    });

    WORDS.forEach(word => {
      const clueEl = document.getElementById(`clue-${word.id}`);
      if (clueEl) {
        clueEl.classList.remove('solved');
        const checkIcon = clueEl.querySelector('.clue-solved-icon');
        if (checkIcon) checkIcon.classList.add('hidden');
      }
    });

    resetTimer();
    state.isGameSolved = false;
    correctWordsCount.textContent = '0';

    // Imkoniyatlarni qayta tiklash: 3 ta harf, 1 ta so'z
    state.letterHintsRemaining = 3;
    state.wordHintsRemaining = 1;
    updateHintBadges();

    updateProgress();
    localStorage.removeItem('krossvord_saved_state');

    // 1-katakchaga qaytish
    selectWord('1-across');
    showToast("Krossvord tozalandi! Imkoniyatlar (3 ta harf, 1 ta so'z) qayta berildi.", 'info');
  }

  // --- 12. Jarayon (Progress) va Statistika ---
  function updateProgress() {
    let filledCount = 0;
    cellMap.forEach((data, key) => {
      const input = getCellInput(data.row, data.col);
      if (input && input.value.trim() !== '') {
        filledCount++;
      }
    });

    const percent = Math.round((filledCount / TOTAL_ACTIVE_CELLS) * 100);
    progressText.textContent = `${filledCount} / ${TOTAL_ACTIVE_CELLS} harf (${percent}%)`;
    progressBarFill.style.width = `${percent}%`;
  }

  // --- 13. LocalStorage bilan Saqlash & Tiklash ---
  function saveProgressToStorage() {
    const savedData = {};
    cellMap.forEach((data, key) => {
      const input = getCellInput(data.row, data.col);
      if (input) {
        savedData[key] = input.value;
      }
    });

    localStorage.setItem('krossvord_saved_state', JSON.stringify({
      cells: savedData,
      timerSeconds: state.timerSeconds,
      letterHintsRemaining: state.letterHintsRemaining,
      wordHintsRemaining: state.wordHintsRemaining
    }));
  }

  function loadProgressFromStorage() {
    try {
      const raw = localStorage.getItem('krossvord_saved_state');
      if (!raw) {
        updateHintBadges();
        return;
      }

      const parsed = JSON.parse(raw);
      if (parsed && parsed.cells) {
        Object.entries(parsed.cells).forEach(([key, val]) => {
          const [r, c] = key.split('-').map(Number);
          const input = getCellInput(r, c);
          if (input && val) {
            input.value = val;
          }
        });
      }

      if (parsed && typeof parsed.timerSeconds === 'number') {
        state.timerSeconds = parsed.timerSeconds;
        updateTimerDisplay();
      }

      if (parsed && typeof parsed.letterHintsRemaining === 'number') {
        state.letterHintsRemaining = parsed.letterHintsRemaining;
      }
      if (parsed && typeof parsed.wordHintsRemaining === 'number') {
        state.wordHintsRemaining = parsed.wordHintsRemaining;
      }

      updateHintBadges();
      updateProgress();
    } catch (e) {
      console.warn('Saqlangan ma\'lumotni yuklashda xato:', e);
      updateHintBadges();
    }
  }

  // --- 14. G'alaba Modali va Konfetti Tizimi ---
  function showVictoryModal(wordsCount) {
    modalScore.textContent = `${wordsCount} / ${WORDS.length}`;
    modalTime.textContent = formatTime(state.timerSeconds);
    victoryModal.classList.remove('hidden');
  }

  function hideVictoryModal() {
    victoryModal.classList.add('hidden');
    stopConfetti();
  }

  // Vanilla Canvas Confetti generatori
  function initConfettiCanvas() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }

  window.addEventListener('resize', initConfettiCanvas);

  function triggerConfetti() {
    initConfettiCanvas();
    particles = [];
    const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'];

    for (let i = 0; i < 160; i++) {
      particles.push({
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
        y: window.innerHeight / 2 - 100,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 1.2) * 18,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
        life: 0
      });
    }

    if (!confettiAnimationId) {
      animateConfetti();
    }
  }

  function animateConfetti() {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35; // Gravitatsiya
      p.rotation += p.rotSpeed;
      p.life++;

      if (p.life > 100) {
        p.opacity -= 0.015;
      }

      confettiCtx.save();
      confettiCtx.globalAlpha = Math.max(0, p.opacity);
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate((p.rotation * Math.PI) / 180);
      confettiCtx.fillStyle = p.color;
      confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
      confettiCtx.restore();
    }

    particles = particles.filter(p => p.opacity > 0 && p.y < window.innerHeight + 50);

    if (particles.length > 0) {
      confettiAnimationId = requestAnimationFrame(animateConfetti);
    } else {
      stopConfetti();
    }
  }

  function stopConfetti() {
    if (confettiAnimationId) {
      cancelAnimationFrame(confettiAnimationId);
      confettiAnimationId = null;
    }
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    particles = [];
  }

  // --- 15. Mavzu va Ovoz Sozlamalari ---
  function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', state.theme);
    localStorage.setItem('krossvord_theme', state.theme);

    if (state.theme === 'light') {
      themeIconSun.classList.add('hidden');
      themeIconMoon.classList.remove('hidden');
    } else {
      themeIconSun.classList.remove('hidden');
      themeIconMoon.classList.add('hidden');
    }
  }

  function loadTheme() {
    const savedTheme = localStorage.getItem('krossvord_theme') || 'dark';
    state.theme = savedTheme;
    document.body.setAttribute('data-theme', savedTheme);
    if (savedTheme === 'light') {
      themeIconSun.classList.add('hidden');
      themeIconMoon.classList.remove('hidden');
    } else {
      themeIconSun.classList.remove('hidden');
      themeIconMoon.classList.add('hidden');
    }
  }

  function toggleSound() {
    state.soundEnabled = !state.soundEnabled;
    localStorage.setItem('krossvord_sound', state.soundEnabled ? '1' : '0');

    if (state.soundEnabled) {
      soundIconOn.classList.remove('hidden');
      soundIconOff.classList.add('hidden');
      playSound('select');
      showToast('Ovoz yoqildi', 'info');
    } else {
      soundIconOn.classList.add('hidden');
      soundIconOff.classList.remove('hidden');
      showToast('Ovoz o\'chirildi', 'info');
    }
  }

  function loadSoundPref() {
    const savedSound = localStorage.getItem('krossvord_sound');
    if (savedSound === '0') {
      state.soundEnabled = false;
      soundIconOn.classList.add('hidden');
      soundIconOff.classList.remove('hidden');
    }
  }

  // --- 16. Hodisalar Tinglovchilari (Event Listeners) ---
  function initEventListeners() {
    checkBtn.addEventListener('click', checkAnswers);
    hintBtn.addEventListener('click', revealCurrentCell);
    revealWordBtn.addEventListener('click', revealCurrentWord);

    resetBtn.addEventListener('click', () => {
      confirmModal.classList.remove('hidden');
    });

    confirmYesBtn.addEventListener('click', () => {
      confirmModal.classList.add('hidden');
      clearAllGrid();
    });

    confirmNoBtn.addEventListener('click', () => {
      confirmModal.classList.add('hidden');
    });

    showSolutionBtn.addEventListener('click', () => {
      revealFullSolution();
    });

    printBtn.addEventListener('click', () => {
      window.print();
    });

    soundBtn.addEventListener('click', toggleSound);
    themeBtn.addEventListener('click', toggleTheme);

    helpBtn.addEventListener('click', () => {
      helpModal.classList.remove('hidden');
    });
    helpCloseBtn.addEventListener('click', () => {
      helpModal.classList.add('hidden');
    });
    helpCloseX.addEventListener('click', () => {
      helpModal.classList.add('hidden');
    });

    modalCloseBtn.addEventListener('click', hideVictoryModal);
    modalRestartBtn.addEventListener('click', () => {
      hideVictoryModal();
      clearAllGrid();
    });

    // Modal tashqarisiga bosganda yopish
    [victoryModal, helpModal, confirmModal].forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
          if (modal === victoryModal) stopConfetti();
        }
      });
    });

    // Klaviatura Escape tugmasi
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        [victoryModal, helpModal, confirmModal].forEach(m => m.classList.add('hidden'));
        stopConfetti();
      }
    });
  }

  // --- 17. Dasturni Ishga Tushirish (Init) ---
  function init() {
    loadTheme();
    loadSoundPref();
    renderGrid();
    renderClues();
    initEventListeners();
    loadProgressFromStorage();
    updateHintBadges();
    selectWord('1-across');
    updateProgress();
  }

  // DOM to'liq tayyor bo'lgach ishga tushirish
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
