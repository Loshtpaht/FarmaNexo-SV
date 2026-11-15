'use strict';

window.GlassControls = (() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  // A critically damped spring, evaluated from its current position and velocity.
  // Changing the target leaves both values intact, including mid-flight reversals.
  function spring(initial, draw) {
    let values = initial.slice();
    let target = initial.slice();
    let velocity = initial.map(() => 0);
    let frame = 0;
    let last = 0;
    draw(values);

    function snap() {
      cancelAnimationFrame(frame);
      frame = 0;
      values = target.slice();
      velocity.fill(0);
      draw(values);
    }

    function step(now) {
      const time = Math.max(0, now - last) / 1000;
      last = now;
      const rate = 22;
      const decay = Math.exp(-rate * time);
      let moving = false;
      values = values.map((value, index) => {
        const offset = value - target[index];
        const slope = velocity[index] + rate * offset;
        const remaining = (offset + slope * time) * decay;
        velocity[index] = (velocity[index] - rate * slope * time) * decay;
        moving ||= Math.abs(remaining) > .002 || Math.abs(velocity[index]) > .02;
        return target[index] + remaining;
      });
      if (moving) {
        draw(values);
        frame = requestAnimationFrame(step);
      } else {
        snap();
      }
    }

    reducedMotion.addEventListener('change', event => { if (event.matches) snap(); });
    return (next, immediate = false) => {
      target = next;
      if (immediate || reducedMotion.matches) snap();
      else if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(step);
      }
    };
  }

  function theme(button, {key, light, dark, colors, onChange}) {
    const root = document.documentElement;
    const thumb = button.querySelector('.glass-thumb');
    const label = button.querySelector('.glass-theme-label');
    const pieces = [...button.querySelectorAll('.glass-spark')];
    const meta = document.querySelector('meta[name="theme-color"]');
    const position = value => value === 'dark' ? 1 : 0;
    const move = spring([position(root.dataset.theme)], ([progress]) => {
      thumb.style.setProperty('--travel', progress);
    });
    let timer;
    let sparks = [];

    function reflect(value) {
      const isDark = value === 'dark';
      const action = 'Activar ' + (isDark ? light : dark);
      button.setAttribute('aria-checked', String(isDark));
      const destination = isDark ? light : dark;
      label.textContent = destination;
      label.dataset.compact = destination.split(' — ')[0];
      button.title = action;
      meta.content = colors[value];
    }

    function set(value, animate) {
      if (value === root.dataset.theme) return;
      root.classList.add('theme-transition');
      clearTimeout(timer);
      root.dataset.theme = value;
      reflect(value);
      move([position(value)], !animate);
      sparks.forEach(animation => animation.cancel());
      if (animate && !reducedMotion.matches && thumb.animate) {
        const direction = value === 'dark' ? 1 : -1;
        sparks = pieces.map((piece, index) => {
          const x = direction * (index === 1 ? 12 : 7);
          const y = (index - 1) * 10;
          return piece.animate([
            {opacity:0, transform:'translate(0, 0) scale(.5)'},
            {opacity:.9, offset:.32},
            {opacity:0, transform:'translate(' + x + 'px,' + y + 'px) scale(.25)'}
          ], {duration:180, easing:'ease-out'});
        });
      }
      timer = setTimeout(() => root.classList.remove('theme-transition'), 260);
      onChange?.(value, animate);
    }

    reflect(root.dataset.theme);
    button.addEventListener('click', () => {
      const value = root.dataset.theme === 'dark' ? 'light' : 'dark';
      set(value, true);
      try { localStorage.setItem(key, value); } catch {}
    });
    window.addEventListener('storage', event => {
      if (event.key === key) set(event.newValue === 'dark' ? 'dark' : 'light', false);
    });
    reducedMotion.addEventListener('change', event => {
      if (event.matches) sparks.forEach(animation => animation.cancel());
    });
  }

  function indicator(nav, selected) {
    const ink = document.createElement('span');
    ink.className = 'glass-indicator';
    ink.setAttribute('aria-hidden', 'true');
    nav.prepend(ink);
    let move;

    function update(immediate = false) {
      const button = nav.querySelector(selected);
      if (!button || !button.offsetWidth) return;
      const next = [button.offsetLeft, button.offsetTop, button.offsetWidth, button.offsetHeight];
      if (!move) {
        move = spring(next, ([x, y, width, height]) => {
          ink.style.transform = 'translate(' + x + 'px,' + y + 'px)';
          ink.style.width = width + 'px';
          ink.style.height = height + 'px';
        });
        immediate = true;
      }
      move(next, immediate);
      nav.classList.add('has-glass-indicator');
    }

    new ResizeObserver(() => update(true)).observe(nav);
    update();
    return update;
  }

  function disclosure(wrapper, button, panel, field, onClose) {
    function setOpen(open, restoreFocus = false) {
      if (open === (button.getAttribute('aria-expanded') === 'true')) return;
      wrapper.toggleAttribute('data-panel-open', open);
      button.setAttribute('aria-expanded', String(open));
      panel.inert = !open;
      panel.setAttribute('aria-hidden', String(!open));
      if (open) field.focus({preventScroll:true});
      else {
        if (restoreFocus) button.focus({preventScroll:true});
        onClose?.();
      }
    }

    button.addEventListener('click', () => setOpen(button.getAttribute('aria-expanded') === 'false'));
    wrapper.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || button.getAttribute('aria-expanded') === 'false') return;
      event.preventDefault();
      setOpen(false, true);
    });
    wrapper.addEventListener('focusout', event => {
      if (!wrapper.contains(event.relatedTarget)) setOpen(false);
    });
    document.addEventListener('pointerdown', event => {
      if (!wrapper.contains(event.target)) setOpen(false);
    });
    return setOpen;
  }

  function intensity(input) {
    const root = document.documentElement;
    const output = input.labels[0].querySelector('output');

    function reflect(value) {
      const level = /^(?:100|[1-9]?[0-9])$/.test(value) ? Number(value) : 65;
      root.dataset.glassLevel = level;
      root.style.setProperty('--glass-strength', level / 100);
      input.value = level;
      output.textContent = level + '%';
      input.setAttribute('aria-valuetext', level === 0 ? 'Sólido' : level + '%');
    }

    reflect(root.dataset.glassLevel);
    input.addEventListener('input', () => reflect(input.value));
    input.addEventListener('change', () => {
      try { localStorage.setItem('glass-level', input.value); } catch {}
    });
    window.addEventListener('storage', event => {
      if (event.key === 'glass-level') reflect(event.newValue);
    });
  }

  return {theme, indicator, disclosure, intensity, reducedMotion};
})();
