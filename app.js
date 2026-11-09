const STORY_COPY = {
  beginning: {
    kicker: '第一幕 · 起初',
    body: '起初的照片里，我们还没有后来那么多默契。镜头举得匆忙，光线也不总是刚好。可现在回头看，每一次愿意靠近一点，都是故事在悄悄开场。',
    line: '那时我们还不知道，镜头里的两个人，会一起走这么远。',
  },
  ordinary: {
    kicker: '第二幕 · 日常',
    body: '真正把两个人变成“我们”的，不是某一个盛大的瞬间。是一起吃过的饭、看过的电影、走累时靠近的肩膀，是那些当时没有特意纪念、后来却舍不得忘的日子。',
    line: '日子没有每天发光，但你在的时候，我总想把它留下。',
  },
  journey: {
    kicker: '第三幕 · 出发',
    body: '后来我们去看湖、夜色、城市和人群。风景当然漂亮，可我记得更清楚的，是每一次转头时你还在身边。地方很多，故事却始终只有一个主角：我们。',
    line: '所谓远方，大概就是和你一起抵达的地方。',
  },
  parallel: {
    kicker: '第四幕 · 平行世界',
    body: '我们换过许多衣服，也像是短暂地活过许多人生。旧时光、礼服、灯光和镜头把世界改了模样，唯一没有变的是，我站在你旁边时，总觉得这一幕应该被留下。',
    line: '换一种世界，换一种身份，我还是会站到你身边。',
  },
  promise: {
    kicker: '第五幕 · 约定',
    body: '直到有一天，喜欢不再只是两个人之间的秘密。我们把认真写在衣服上、写进合影里，也说给最重要的人听。那一天的热闹过去以后，我仍然记得：我们看向彼此时，很安静，也很确定。',
    line: '从“我喜欢你”，到“我们一起往后走”。',
  },
  after: {
    kicker: '第六幕 · 以后',
    body: '我不想把故事停在某一张最好看的照片上。因为我们真正想要的，从来不是一个完美结局，而是在往后的普通日子里，还愿意继续为对方拍照，继续一起出门，继续回家。',
    line: '故事没有结束，只是镜头暂时停在了今天。',
  },
};

const gate = document.querySelector('#gate');
const story = document.querySelector('#story');
const holdButton = document.querySelector('#holdButton');
const chapterNav = document.querySelector('#chapterNav');
const chaptersRoot = document.querySelector('#chapters');
const chapterTemplate = document.querySelector('#chapterTemplate');
const progress = document.querySelector('#readingProgress');
const proposalVideo = document.querySelector('#proposalVideo');
const filmOptions = [...document.querySelectorAll('.film-option')];
const musicDock = document.querySelector('#musicDock');
const musicDockToggle = document.querySelector('#musicDockToggle');
const lightbox = document.querySelector('#lightbox');
const lightboxImage = document.querySelector('#lightboxImage');
const lightboxChapter = document.querySelector('#lightboxChapter');
const lightboxCount = document.querySelector('#lightboxCount');

let holdStart = 0;
let holdFrame = 0;
let opening = false;
let allPhotos = [];
let currentPhoto = 0;
let revealObserver;
let motionFrame = 0;
const activeMotionCards = new Set();
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const SCENE_CYCLE = {
  beginning: ['stack', 'focus', 'reel', 'stack'],
  ordinary: ['duet', 'reel', 'focus', 'stack'],
  journey: ['reel', 'duet', 'focus', 'reel'],
  parallel: ['focus', 'stack', 'duet'],
  promise: ['stack', 'focus', 'reel'],
  after: ['focus', 'duet'],
};

const SCENE_MOTIONS = {
  reel: ['rail-left', 'rail-right', 'rail-left', 'rail-right', 'rail-left', 'rail-right'],
  stack: ['tilt-left', 'float', 'tilt-right', 'tilt-left', 'float', 'tilt-right'],
  focus: ['float', 'rail-right', 'tilt-left', 'rail-left', 'tilt-right', 'float'],
  duet: ['rail-left', 'rail-left', 'rail-left', 'rail-right', 'rail-right', 'rail-right'],
};

function setHoldProgress(value) {
  document.documentElement.style.setProperty('--hold', Math.min(1, Math.max(0, value)));
}

function finishOpening() {
  if (opening) return;
  opening = true;
  setHoldProgress(1);
  story.classList.add('is-visible');
  story.setAttribute('aria-hidden', 'false');
  gate.classList.add('is-open');
  document.body.style.overflow = 'auto';
}

function tickHold(now) {
  setHoldProgress((now - holdStart) / 1350);
  if (now - holdStart >= 1350) {
    finishOpening();
    return;
  }
  holdFrame = requestAnimationFrame(tickHold);
}

function beginHold(event) {
  if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
  event.preventDefault();
  cancelAnimationFrame(holdFrame);
  holdStart = performance.now();
  holdFrame = requestAnimationFrame(tickHold);
}

function cancelHold(event) {
  if (event?.type === 'keyup' && !['Enter', ' '].includes(event.key)) return;
  if (opening) return;
  cancelAnimationFrame(holdFrame);
  setHoldProgress(0);
}

function cardClass(item, index) {
  const classes = ['memory-card'];
  if (item.orientation === 'portrait') classes.push('is-portrait');
  if (item.orientation === 'landscape') classes.push('is-wide');
  if (index % 17 === 0 || index % 23 === 9) classes.push('is-feature');
  return classes.join(' ');
}

function createPhoto(item, chapter, localIndex, sceneVariant, positionInScene) {
  const globalIndex = allPhotos.length;
  allPhotos.push({ ...item, chapter: chapter.short, globalIndex });
  const figure = document.createElement('figure');
  figure.className = cardClass(item, localIndex);
  figure.style.setProperty('--ratio', item.ratio);
  figure.style.setProperty('--photo-color', item.color);
  figure.dataset.order = String(globalIndex + 1).padStart(3, '0');
  figure.dataset.motion = SCENE_MOTIONS[sceneVariant][positionInScene % 6];
  figure.dataset.strength = String(14 + ((globalIndex * 7) % 16));
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', `查看${chapter.short}章节第 ${localIndex + 1} 张照片`);
  const image = document.createElement('img');
  image.src = item.src;
  image.alt = `${chapter.short} · 回忆照片 ${localIndex + 1}`;
  image.loading = chapter.id === 'beginning' && localIndex < 12 ? 'eager' : 'lazy';
  if (chapter.id === 'beginning' && localIndex < 4) image.fetchPriority = 'high';
  image.decoding = 'async';
  button.append(image);
  button.addEventListener('click', () => openLightbox(globalIndex));
  figure.append(button);
  return figure;
}

function createScene(chapter, items, startIndex, sceneIndex) {
  const variants = SCENE_CYCLE[chapter.id];
  const variant = variants[sceneIndex % variants.length];
  const scene = document.createElement('section');
  scene.className = `photo-scene scene-${variant}`;
  scene.dataset.scene = String(sceneIndex + 1).padStart(2, '0');
  const track = document.createElement('div');
  track.className = 'scene-track';
  items.forEach((item, position) => {
    track.append(createPhoto(item, chapter, startIndex + position, variant, position));
  });
  scene.append(track);
  return scene;
}

function renderStory(data) {
  data.chapters.forEach((chapter, chapterIndex) => {
    if (chapter.id === 'after') chaptersRoot.append(document.querySelector('#film'));
    const copy = STORY_COPY[chapter.id];
    const fragment = chapterTemplate.content.cloneNode(true);
    const section = fragment.querySelector('.archive-chapter');
    section.id = chapter.id;
    section.dataset.tone = chapter.tone;
    section.dataset.chapterIndex = chapterIndex;
    fragment.querySelector('.chapter-number').textContent = String(chapterIndex + 1).padStart(2, '0');
    fragment.querySelector('.chapter-kicker').textContent = copy.kicker;
    fragment.querySelector('.chapter-title').textContent = chapter.title;
    fragment.querySelector('.chapter-body').textContent = copy.body;
    fragment.querySelector('.chapter-count').textContent = `${String(chapter.items.length).padStart(2, '0')} PHOTOGRAPHS`;
    fragment.querySelector('.chapter-line').textContent = copy.line;
    const sequence = fragment.querySelector('.photo-sequence');
    for (let startIndex = 0, sceneIndex = 0; startIndex < chapter.items.length; startIndex += 6, sceneIndex += 1) {
      sequence.append(createScene(chapter, chapter.items.slice(startIndex, startIndex + 6), startIndex, sceneIndex));
    }
    chaptersRoot.append(fragment);

    const navButton = document.createElement('button');
    navButton.type = 'button';
    navButton.className = `chapter-link${chapterIndex === 0 ? ' is-current' : ''}`;
    navButton.dataset.target = chapter.id;
    navButton.textContent = chapter.short;
    navButton.addEventListener('click', () => document.querySelector(`#${chapter.id}`).scrollIntoView({ behavior: 'smooth' }));
    chapterNav.append(navButton);
  });
  bindObservers();
}

function bindObservers() {
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -5% 0px' });
  document.querySelectorAll('.reveal, .memory-card').forEach((element) => revealObserver.observe(element));

  if (!reduceMotion) {
    const motionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) activeMotionCards.add(entry.target);
        else activeMotionCards.delete(entry.target);
      });
      scheduleMotion();
    }, { rootMargin: '35% 0px 35% 0px' });
    document.querySelectorAll('.memory-card').forEach((card) => motionObserver.observe(card));
  }

  const markerObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      document.body.dataset.tone = entry.target.dataset.tone || 'night';
      const chapterId = entry.target.id;
      document.querySelectorAll('.chapter-link').forEach((button) => {
        button.classList.toggle('is-current', button.dataset.target === chapterId);
      });
    });
  }, { threshold: 0.08, rootMargin: '-38% 0px -52% 0px' });
  document.querySelectorAll('.chapter-marker').forEach((marker) => markerObserver.observe(marker));
}

function updateMotion() {
  motionFrame = 0;
  if (reduceMotion) return;
  const viewportHeight = window.innerHeight;
  const mobileFactor = window.innerWidth < 700 ? 0.42 : 1;
  activeMotionCards.forEach((card) => {
    const rect = card.getBoundingClientRect();
    const progressValue = Math.max(-1, Math.min(1, (rect.top + rect.height / 2 - viewportHeight / 2) / viewportHeight));
    const strength = Number(card.dataset.strength) * mobileFactor;
    let x = 0;
    let y = progressValue * strength * -0.45;
    let rotation = 0;
    switch (card.dataset.motion) {
      case 'rail-left':
        x = progressValue * strength * -1.7;
        rotation = progressValue * -0.7;
        break;
      case 'rail-right':
        x = progressValue * strength * 1.7;
        rotation = progressValue * 0.7;
        break;
      case 'tilt-left':
        x = progressValue * strength * -0.5;
        rotation = -2.4 + progressValue * 1.1;
        break;
      case 'tilt-right':
        x = progressValue * strength * 0.5;
        rotation = 2.4 + progressValue * -1.1;
        break;
      default:
        y = progressValue * strength * -0.9;
        rotation = progressValue * 0.45;
    }
    card.style.setProperty('--motion-x', `${x.toFixed(2)}px`);
    card.style.setProperty('--motion-y', `${y.toFixed(2)}px`);
    card.style.setProperty('--motion-r', `${rotation.toFixed(2)}deg`);
  });
}

function scheduleMotion() {
  if (motionFrame || reduceMotion) return;
  motionFrame = requestAnimationFrame(updateMotion);
}

function openLightbox(index) {
  currentPhoto = (index + allPhotos.length) % allPhotos.length;
  const photo = allPhotos[currentPhoto];
  lightboxImage.src = photo.src;
  lightboxImage.alt = `${photo.chapter} · 回忆照片`;
  lightboxChapter.textContent = photo.chapter;
  lightboxCount.textContent = `${String(currentPhoto + 1).padStart(3, '0')} / ${allPhotos.length}`;
  if (!lightbox.open) lightbox.showModal();
}

function updateReadingProgress() {
  if (!opening) return;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = maxScroll > 0 ? window.scrollY / maxScroll : 0;
  progress.style.transform = `scaleX(${Math.min(1, Math.max(0, ratio))})`;
  scheduleMotion();
}

holdButton.addEventListener('pointerdown', beginHold);
holdButton.addEventListener('pointerup', cancelHold);
holdButton.addEventListener('pointercancel', cancelHold);
holdButton.addEventListener('pointerleave', cancelHold);
holdButton.addEventListener('keydown', beginHold);
holdButton.addEventListener('keyup', cancelHold);
window.addEventListener('scroll', updateReadingProgress, { passive: true });
window.addEventListener('resize', scheduleMotion);

window.addEventListener('keydown', (event) => {
  if (!lightbox.open) return;
  if (event.key === 'ArrowLeft') openLightbox(currentPhoto - 1);
  if (event.key === 'ArrowRight') openLightbox(currentPhoto + 1);
});
document.querySelector('#lightboxClose').addEventListener('click', () => lightbox.close());
document.querySelector('#lightboxPrev').addEventListener('click', () => openLightbox(currentPhoto - 1));
document.querySelector('#lightboxNext').addEventListener('click', () => openLightbox(currentPhoto + 1));
lightbox.addEventListener('click', (event) => { if (event.target === lightbox) lightbox.close(); });

filmOptions.forEach((option) => {
  option.addEventListener('click', () => {
    if (option.classList.contains('is-active')) return;
    proposalVideo.pause();
    proposalVideo.src = option.dataset.src;
    proposalVideo.load();
    filmOptions.forEach((button) => button.classList.toggle('is-active', button === option));
  });
});

musicDockToggle.addEventListener('click', () => {
  const minimized = musicDock.classList.toggle('is-minimized');
  musicDockToggle.setAttribute('aria-expanded', String(!minimized));
});

proposalVideo.addEventListener('play', () => {
  musicDock.classList.remove('is-minimized');
  musicDockToggle.setAttribute('aria-expanded', 'true');
});

if (window.STORY_DATA) {
  renderStory(window.STORY_DATA);
} else {
  fetch('story-data.json?v=7')
    .then((response) => {
      if (!response.ok) throw new Error(`故事数据加载失败：${response.status}`);
      return response.json();
    })
    .then(renderStory)
    .catch((error) => {
      console.error(error);
      chaptersRoot.innerHTML = '<p class="load-error">照片故事暂时没有加载成功，请刷新页面重试。</p>';
    });
}
