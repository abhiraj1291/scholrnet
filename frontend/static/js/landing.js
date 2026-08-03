(function(){
  'use strict';

  // Image error fallbacks (standalone pages don't load base.html's handler)
  document.addEventListener('error', function(e) {
    if (e.target.tagName !== 'IMG') return;
    var action = e.target.getAttribute('data-img-error');
    if (!action) return;
    if (action === 'hide-parent' && e.target.parentElement) e.target.parentElement.style.display = 'none';
    else if (action === 'hide-self') e.target.style.display = 'none';
    else if (action === 'show-error') {
      if (e.target.parentElement) e.target.parentElement.innerHTML = '<div class="text-xs text-muted py-4" style="text-align:center">Image could not load</div>';
    }
    else if (action === 'show-fallback') {
      e.target.style.display = 'none';
      if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'flex';
    }
    else if (action === 'hide-with-fallback') {
      e.target.style.display = 'none';
      if (e.target.parentElement) {
        e.target.parentElement.style.background = 'linear-gradient(135deg,var(--primary),#8B6CFF)';
        e.target.parentElement.textContent = 'A';
      }
    }
  }, true);

  // Nav scroll shadow
  var nav = document.querySelector('.nav');
  if (nav) {
    window.addEventListener('scroll', function() {
      nav.style.borderBottomColor = window.scrollY > 10 ? 'var(--border)' : 'var(--border-light)';
    }, { passive: true });
  }

  // Intersection Observer for fade-up elements
  var fadeEls = document.querySelectorAll('.fade-up');
  if (fadeEls.length && 'IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    fadeEls.forEach(function(el) { obs.observe(el); });
  }

  // FAQ — open/close animation
  document.querySelectorAll('.faq-item').forEach(function(item) {
    item.addEventListener('toggle', function() {
      if (item.open) {
        item.querySelector('.faq-answer').style.animation = 'none';
        item.querySelector('.faq-answer').offsetHeight; // trigger reflow
        item.querySelector('.faq-answer').style.animation = 'fadeIn 0.25s ease';
      }
    });
  });

  // Mobile nav toggle — smooth slide animation
  window.toggleMobileNav = function() {
    var el = document.getElementById('mobileNav');
    if (el) {
      el.classList.toggle('nav-open');
      var btn = document.querySelector('.nav-mobile-toggle');
      if (btn) {
        btn.setAttribute('aria-expanded', el.classList.contains('nav-open'));
        btn.setAttribute('aria-label', el.classList.contains('nav-open') ? 'Close menu' : 'Open menu');
      }
    }
  };

  // Init mobile toggle aria
  (function() {
    var btn = document.querySelector('.nav-mobile-toggle');
    if (btn && !btn.getAttribute('aria-expanded')) {
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', 'Open menu');
    }
  })();

  // Close mobile nav on escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      var el = document.getElementById('mobileNav');
      if (el && el.classList.contains('nav-open')) {
        el.classList.remove('nav-open');
        var btn = document.querySelector('.nav-mobile-toggle');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      }
    }
  });

  // Close mobile nav on outside tap
  document.addEventListener('click', function(e) {
    var el = document.getElementById('mobileNav');
    var toggle = document.querySelector('.nav-mobile-toggle');
    if (el && el.classList.contains('nav-open') && !el.contains(e.target) && toggle && !toggle.contains(e.target)) {
      el.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  // Hero card entrance animation
  var heroCards = document.querySelectorAll('.hero-card');
  heroCards.forEach(function(card, i) {
    card.style.opacity = '0';
    card.style.transform = 'translateY(15px)';
    setTimeout(function() {
      card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 400 + i * 200);
  });

  // Add fade-in keyframes for FAQ
  var style = document.createElement('style');
  style.textContent = '@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }';
  document.head.appendChild(style);

  // Smooth scroll for nav links (fallback for browsers that don't support scroll-behavior)
  document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
      var target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
})();
