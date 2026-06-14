(function(){
  'use strict';

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

  // Mobile nav toggle
  window.toggleMobileNav = function() {
    var el = document.getElementById('mobileNav');
    if (el) el.classList.toggle('hidden');
  };

  // Close mobile nav on escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      var el = document.getElementById('mobileNav');
      if (el && !el.classList.contains('hidden')) el.classList.add('hidden');
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

  // Email capture
  window.captureLead = function(e) {
    var name = document.getElementById('leadName').value.trim();
    var email = document.getElementById('leadEmail').value.trim();
    var status = document.getElementById('leadStatus');
    if (!email) { status.textContent = 'Please enter your email.'; return false; }
    status.textContent = 'Saving...';
    fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, email: email })
    }).then(function(r) { return r.json(); }).then(function(d) {
      status.textContent = d.success ? "You're on the list!" : d.error || 'Something went wrong.';
      if (d.success) document.getElementById('leadEmail').value = '';
    }).catch(function() {
      status.textContent = 'Network error. Try again.';
    });
    return false;
  };

  // Exit intent modal
  (function(){
    var modal = document.getElementById('exitModal');
    if (!modal) return;
    var shown = localStorage.getItem('exitLeadShown');
    if (shown) return;
    var dismissed = false;
    function show() {
      if (dismissed) return;
      if (localStorage.getItem('exitLeadShown')) return;
      localStorage.setItem('exitLeadShown', '1');
      modal.classList.add('visible');
    }
    document.addEventListener('mouseleave', function(e) {
      if (e.clientY <= 0) show();
    });
    function closeModal() {
      modal.classList.remove('visible');
    }
    modal.querySelector('.exit-modal-close').addEventListener('click', closeModal);
    var noThanks = modal.querySelector('.exit-no-thanks');
    if (noThanks) noThanks.addEventListener('click', function() { dismissed = true; closeModal(); });
    modal.addEventListener('click', function(e) {
      if (e.target === modal) closeModal();
    });
    // Also capture lead inside modal
    var modalForm = modal.querySelector('.cta-email-inner');
    if (modalForm) {
      modalForm.addEventListener('submit', function(ev) {
        ev.preventDefault();
        var name = modalForm.querySelector('#leadName') || modalForm.querySelector('input[type="text"]');
        var email = modalForm.querySelector('#leadEmail') || modalForm.querySelector('input[type="email"]');
        var status = modal.querySelector('.cta-email-status');
        if (!email || !email.value.trim()) { if (status) status.textContent = 'Please enter your email.'; return; }
        if (status) status.textContent = 'Saving...';
        fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name ? name.value.trim() : '', email: email.value.trim() })
        }).then(function(r) { return r.json(); }).then(function(d) {
          if (status) status.textContent = d.success ? "You're on the list!" : d.error || 'Error.';
          if (d.success) { email.value = ''; if (name) name.value = ''; }
          setTimeout(closeModal, 1500);
        }).catch(function() {
          if (status) status.textContent = 'Network error.';
        });
      });
    }
  })();
