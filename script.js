(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasIO = 'IntersectionObserver' in window;

  /* ---------- Smooth (inertia) scrolling ---------- */
  let lenis = null;
  if (window.Lenis && !reduceMotion) {
    lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 1, smoothWheel: true });
    document.documentElement.classList.add('lenis-on');
    const raf = time => { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  // In-page links glide to their section, leaving room for the fixed header
  document.addEventListener('click', e => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute('href');
    if (id === '#') { e.preventDefault(); return; }
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: -90, duration: 1.3 });
    else target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    history.replaceState(null, '', id);
  });

  /* ---------- Floating header (hysteresis so it never flickers) ---------- */
  const header = document.querySelector('[data-header]');
  let floating = false;
  let ticking = false;
  const updateHeader = () => {
    const y = window.scrollY;
    if (!floating && y > 80) { floating = true; header.classList.add('is-floating'); }
    else if (floating && y < 20) { floating = false; header.classList.remove('is-floating'); }
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(updateHeader); }
  }, { passive: true });
  updateHeader();

  /* ---------- Mobile menu ---------- */
  const menu = document.querySelector('.menu');
  const navigation = document.querySelector('#navigation');
  const setMenu = open => {
    navigation.classList.toggle('is-open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.textContent = open ? 'Close' : 'Menu';
  };
  navigation.dataset.enhanced = '';
  menu.hidden = false;
  menu.addEventListener('click', () => setMenu(!navigation.classList.contains('is-open')));
  navigation.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('click', e => {
    if (!navigation.contains(e.target) && !menu.contains(e.target)) setMenu(false);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && navigation.classList.contains('is-open')) { setMenu(false); menu.focus(); }
  });

  /* Highlight the menu item for the section in view */
  const navLinks = [...navigation.querySelectorAll('a[href^="#"]')].filter(a => a.getAttribute('href').length > 1);
  if (hasIO) {
    const navObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const link = navLinks.find(a => a.getAttribute('href') === '#' + entry.target.id);
        if (!link) return;
        navLinks.forEach(a => a.removeAttribute('aria-current'));
        link.setAttribute('aria-current', 'page');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(a => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) navObserver.observe(target);
    });
  }

  /* ---------- Scroll reveal ---------- */
  document.querySelectorAll('[data-stagger]').forEach(group => {
    [...group.children].forEach((child, i) => child.style.setProperty('--d', (i % 8) * 0.08 + 's'));
  });
  const revealItems = document.querySelectorAll('[data-reveal], [data-stagger] > *');
  if (hasIO && !reduceMotion) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealItems.forEach(el => revealObserver.observe(el));
  } else {
    revealItems.forEach(el => el.classList.add('in'));
  }

  /* ---------- Videos: load & play only while visible, optional speed ---------- */
  const lazyVideos = document.querySelectorAll('video[data-lazy-video]');
  const applySpeed = v => {
    const speed = parseFloat(v.dataset.speed || '1');
    v.defaultPlaybackRate = speed;
    v.playbackRate = speed;
  };
  lazyVideos.forEach(v => {
    v.addEventListener('loadedmetadata', () => applySpeed(v));
    v.addEventListener('play', () => applySpeed(v));
  });
  if (hasIO) {
    const videoObserver = new IntersectionObserver(entries => {
      entries.forEach(({ target: v, isIntersecting }) => {
        if (isIntersecting) {
          if (v.preload === 'none') { v.preload = 'auto'; v.load(); }
          if (!reduceMotion) v.play().catch(() => {});
        } else {
          v.pause();
        }
      });
    }, { rootMargin: '200px 0px', threshold: 0.05 });
    lazyVideos.forEach(v => videoObserver.observe(v));
  } else {
    lazyVideos.forEach(v => { v.preload = 'auto'; v.autoplay = true; v.load(); });
  }

  /* ---------- Stats counter ---------- */
  const stats = document.querySelector('#trust .stats');
  if (stats && hasIO && !reduceMotion) {
    const counters = [...stats.querySelectorAll('[data-counter]')];
    const fmt = new Intl.NumberFormat('en-US');
    const statObserver = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      statObserver.disconnect();
      const start = performance.now();
      const tick = now => {
        const p = Math.min(1, (now - start) / 1400);
        const eased = 1 - Math.pow(1 - p, 3);
        counters.forEach(c => { c.textContent = fmt.format(Math.round(Number(c.dataset.counter) * eased)); });
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.35 });
    statObserver.observe(stats);
  }

  /* ---------- Development process: Discover → Plan → … → Launch, in order, on a loop ---------- */
  const process = document.querySelector('[data-process]');
  if (process) {
    const steps = [...process.children];
    const STEP_TIME = 2200;
    process.style.setProperty('--step-time', STEP_TIME + 'ms');
    let index = 0;
    let timer = null;
    const show = () => {
      steps.forEach((s, i) => {
        s.classList.toggle('is-active', i === index);
        s.classList.toggle('is-done', i < index);
      });
      // restart the bar animation on the active step
      const bar = steps[index].querySelector('.step-bar');
      bar.style.animation = 'none';
      void bar.offsetWidth;
      bar.style.animation = '';
      index = (index + 1) % steps.length;
    };
    const start = () => { if (!timer) { show(); timer = setInterval(show, STEP_TIME); } };
    const stop = () => { clearInterval(timer); timer = null; };
    if (reduceMotion || !hasIO) {
      steps.forEach(s => s.classList.add('is-done'));
    } else {
      new IntersectionObserver(([entry]) => {
        entry.isIntersecting ? start() : stop();
      }, { threshold: 0.3 }).observe(process);
    }
  }

  /* ---------- Tech marquee: duplicate for a seamless loop ---------- */
  document.querySelectorAll('.marquee-track').forEach(track => {
    [...track.children].forEach(child => track.appendChild(child.cloneNode(true)));
  });

  /* ---------- Demo chatbot (canned replies, no backend) ---------- */
  const chatbot = document.querySelector('[data-chatbot]');
  if (chatbot) {
    const fab = chatbot.querySelector('.chat-fab');
    const panel = chatbot.querySelector('.chat-panel');
    const log = chatbot.querySelector('[data-chat-log]');
    const form = chatbot.querySelector('[data-chat-form]');
    const input = form.querySelector('input');
    const badge = chatbot.querySelector('.fab-badge');
    log.setAttribute('data-lenis-prevent', '');
    let greeted = false;
    let busy = false;

    const replies = [
      { keys: ['hi', 'hello', 'hey', 'salam', 'assalam'], text: 'Hello! 👋 How can I help you today? You can ask about our services, pricing, timelines or AI solutions.' },
      { keys: ['service', 'build', 'what do you', 'offer'], text: 'We build:\n• Web applications\n• Mobile apps (iOS & Android)\n• AI / ML solutions\n• Desktop apps\n• Cloud & DevOps\n• SaaS products\n\nWhich one are you interested in?' },
      { keys: ['price', 'pricing', 'cost', 'budget', 'quote', 'estimate'], text: 'Every project is scoped individually. We offer fixed-scope projects, dedicated teams and ongoing maintenance. Book a free consultation and we’ll prepare an estimate for you.' },
      { keys: ['time', 'timeline', 'long', 'duration', 'deadline'], text: 'A focused website or prototype usually takes a few weeks. Larger web, mobile or AI products are delivered in milestones over a few months.' },
      { keys: ['ai', 'automation', 'chatbot', 'agent', 'ml', 'machine'], text: 'We build AI assistants, document processing, knowledge search over your own content and workflow automation — and connect them to the tools you already use.' },
      { keys: ['mobile', 'app', 'ios', 'android', 'flutter'], text: 'We build native and cross-platform apps with Flutter or React Native, from design to App Store / Play Store launch.' },
      { keys: ['web', 'website', 'wordpress', 'shopify'], text: 'From marketing websites to complex web apps — React, Next.js, Laravel, WordPress, Shopify and more.' },
      { keys: ['contact', 'email', 'phone', 'call', 'talk', 'consult'], text: 'You can reach us at info@exprovia.com or +1 251 901 5794. Or click “Free consultation” at the top of the page.' },
      { keys: ['support', 'maintenance', 'after'], text: 'Yes — we offer ongoing maintenance, updates, security patches and performance support after launch.' },
      { keys: ['thank', 'thanks'], text: 'You’re welcome! 😊 Anything else I can help with?' }
    ];
    const fallback = 'Thanks for your message! This is a demo assistant. For a detailed answer, our team can help at info@exprovia.com.';
    const answer = text => {
      const t = text.toLowerCase();
      const hit = replies.find(r => r.keys.some(k => new RegExp('\\b' + k).test(t)));
      return hit ? hit.text : fallback;
    };

    const addMsg = (text, who) => {
      const el = document.createElement('div');
      el.className = 'msg ' + who;
      el.textContent = text;
      log.appendChild(el);
      log.scrollTop = log.scrollHeight;
      return el;
    };
    const botSay = text => new Promise(resolve => {
      const typing = document.createElement('div');
      typing.className = 'msg bot typing';
      typing.innerHTML = '<span></span><span></span><span></span>';
      log.appendChild(typing);
      log.scrollTop = log.scrollHeight;
      setTimeout(() => { typing.remove(); addMsg(text, 'bot'); resolve(); }, 650 + Math.min(text.length * 8, 900));
    });
    const send = async text => {
      text = text.trim();
      if (!text || busy) return;
      busy = true;
      addMsg(text, 'user');
      input.value = '';
      await botSay(answer(text));
      busy = false;
    };

    const openChat = () => {
      panel.hidden = false;
      panel.classList.remove('is-closing');
      fab.setAttribute('aria-expanded', 'true');
      fab.setAttribute('aria-label', 'Close chat');
      badge.classList.add('is-hidden');
      if (!greeted) { greeted = true; botSay('Hi! 👋 I’m the Exprovia assistant. How can I help you today?'); }
      setTimeout(() => input.focus(), 50);
    };
    const closeChat = () => {
      fab.setAttribute('aria-expanded', 'false');
      fab.setAttribute('aria-label', 'Open chat');
      panel.classList.add('is-closing');
      setTimeout(() => { panel.hidden = true; panel.classList.remove('is-closing'); }, 240);
    };
    fab.addEventListener('click', () => (panel.hidden ? openChat() : closeChat()));
    chatbot.querySelector('.chat-close').addEventListener('click', () => { closeChat(); fab.focus(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) { closeChat(); fab.focus(); } });
    form.addEventListener('submit', e => { e.preventDefault(); send(input.value); });
    chatbot.querySelector('[data-chat-quick]').addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (btn) send(btn.textContent);
    });
  }

  /* ---------- FAQ accordion ---------- */
  const faq = document.querySelector('[data-faq]');
  if (faq) {
    const items = [...faq.querySelectorAll('.faq-item')];
    items.forEach((item, idx) => {
      const btn = item.querySelector('button');
      const panel = item.querySelector('.faq-panel');
      panel.id = 'faq-panel-' + idx;
      btn.setAttribute('aria-controls', panel.id);
      btn.addEventListener('click', () => {
        const open = !item.classList.contains('is-open');
        items.forEach(other => {
          other.classList.remove('is-open');
          other.querySelector('button').setAttribute('aria-expanded', 'false');
        });
        if (open) { item.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); }
      });
    });
    items[0].classList.add('is-open');
    items[0].querySelector('button').setAttribute('aria-expanded', 'true');
  }
})();
