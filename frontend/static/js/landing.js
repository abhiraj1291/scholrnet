(function(){
  if(typeof lucide !== 'undefined') lucide.createIcons();

  var container = document.getElementById('particles');
  if(container){
    var count = Math.min(30, Math.floor(window.innerWidth / 30));
    for(var i=0; i<count; i++){
      var p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDuration = (12 + Math.random() * 25) + 's';
      p.style.animationDelay = (Math.random() * 20) + 's';
      p.style.width = p.style.height = (2 + Math.random() * 3) + 'px';
      container.appendChild(p);
    }
  }

  var hero = document.querySelector('.hero');
  var glow = document.getElementById('heroGlow');
  if(hero && glow){
    hero.addEventListener('mousemove', function(e){
      var rect = hero.getBoundingClientRect();
      glow.style.left = e.clientX + 'px';
      glow.style.top = e.clientY + 'px';
    });
    hero.addEventListener('mouseenter', function(){ glow.style.opacity = '1'; });
    hero.addEventListener('mouseleave', function(){ glow.style.opacity = '0'; });
  }

  var cards = document.querySelectorAll('.feature-card');
  cards.forEach(function(card){
    card.addEventListener('mousemove', function(e){
      var rect = card.getBoundingClientRect();
      var x = e.clientX - rect.left, y = e.clientY - rect.top;
      var cx = rect.width / 2, cy = rect.height / 2;
      var rx = ((y - cy) / cy) * -5, ry = ((x - cx) / cx) * 5;
      card.style.transform = 'perspective(800px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateY(-3px)';
    });
    card.addEventListener('mouseleave', function(){
      card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)';
    });
  });

  var revealEls = document.querySelectorAll('.reveal');
  if(revealEls.length && 'IntersectionObserver' in window){
    var obs = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){ e.target.classList.add('visible'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.1 });
    revealEls.forEach(function(el){ obs.observe(el); });
  }

  document.querySelectorAll('.ripple').forEach(function(btn){
    btn.addEventListener('click', function(e){
      var rect = btn.getBoundingClientRect();
      var ripple = document.createElement('span');
      ripple.className = 'ripple-effect';
      var size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size/2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size/2) + 'px';
      btn.appendChild(ripple);
      setTimeout(function(){ ripple.remove(); }, 500);
    });
  });
})();
