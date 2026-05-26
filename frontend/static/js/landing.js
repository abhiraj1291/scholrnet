(function(){
  // Lucide icons
  if(typeof lucide !== 'undefined') lucide.createIcons();

  // Particles
  var container = document.getElementById('particles');
  if(container){
    var count = Math.min(50, Math.floor(window.innerWidth / 20));
    for(var i=0; i<count; i++){
      var p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDuration = (10 + Math.random() * 20) + 's';
      p.style.animationDelay = (Math.random() * 15) + 's';
      p.style.width = p.style.height = (2 + Math.random() * 4) + 'px';
      container.appendChild(p);
    }
  }

  // Counter animation via IntersectionObserver
  var stats = document.querySelectorAll('.stat-num');
  if(stats.length && 'IntersectionObserver' in window){
    var observed = false;
    var obs = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting && !observed){
          observed = true;
          stats.forEach(function(el){
            var target = parseInt(el.getAttribute('data-target'), 10);
            if(isNaN(target)) return;
            var current = 0;
            var step = Math.max(1, Math.floor(target / 40));
            var interval = setInterval(function(){
              current += step;
              if(current >= target){ current = target; clearInterval(interval); }
              el.textContent = current.toLocaleString();
            }, 30);
          });
          obs.disconnect();
        }
      });
    }, { threshold: 0.3 });
    obs.observe(document.getElementById('statsGrid'));
  }

  // Feature card tilt on mouse move (desktop)
  var cards = document.querySelectorAll('.feature-card');
  cards.forEach(function(card){
    card.addEventListener('mousemove', function(e){
      var rect = card.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      var centerX = rect.width / 2;
      var centerY = rect.height / 2;
      var rotateX = ((y - centerY) / centerY) * -6;
      var rotateY = ((x - centerX) / centerX) * 6;
      card.style.transform = 'perspective(800px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) translateY(-4px)';
    });
    card.addEventListener('mouseleave', function(){
      card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)';
    });
  });
})();
