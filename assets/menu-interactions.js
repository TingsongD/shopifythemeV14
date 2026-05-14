/* ========================================
   APPLE-STYLE MENU INTERACTIONS
   ======================================== */
document.addEventListener('DOMContentLoaded', function() {

  // Desktop dropdown menu - Apple-style smooth animations
  var dropdownItems = document.querySelectorAll('.menu__item--has-dropdown');
  var activeDropdown = null;

  dropdownItems.forEach(function(item) {
    var dropdown = item.querySelector('.menu__dropdown');
    if (!dropdown) return;

    // Get all links in dropdown for stagger animation
    var links = dropdown.querySelectorAll('a');

    item.addEventListener('mouseenter', function() {
      // Close any other open dropdown first
      if (activeDropdown && activeDropdown !== dropdown) {
        activeDropdown.style.display = 'none';
        activeDropdown.style.opacity = '0';
        activeDropdown.style.visibility = 'hidden';
        activeDropdown.style.transform = 'translateX(-50%) translateY(-10px)';
      }

      // Open this dropdown with Apple-style animation
      dropdown.style.display = 'block';

      // Force reflow for smooth transition
      void dropdown.offsetWidth;

      setTimeout(function() {
        dropdown.style.opacity = '1';
        dropdown.style.visibility = 'visible';
        dropdown.style.transform = 'translateX(-50%) translateY(0)';
      }, 10);

      // Stagger animation for dropdown items (subtle Apple effect)
      links.forEach(function(link, index) {
        link.style.transitionDelay = (index * 0.03) + 's';
      });

      activeDropdown = dropdown;
    });

    item.addEventListener('mouseleave', function() {
      // Apple-style fade out
      dropdown.style.opacity = '0';
      dropdown.style.visibility = 'hidden';
      dropdown.style.transform = 'translateX(-50%) translateY(-10px)';

      setTimeout(function() {
        if (dropdown.style.opacity === '0') {
          dropdown.style.display = 'none';
        }
      }, 400);

      // Reset stagger delays
      links.forEach(function(link) {
        link.style.transitionDelay = '0s';
      });

      if (activeDropdown === dropdown) {
        activeDropdown = null;
      }
    });
  });

  // Mobile accordion menu functionality
  var mobileMenuItems = document.querySelectorAll('.mobile-menu__item--has-submenu');
  mobileMenuItems.forEach(function(item) {
    var parent = item.querySelector('.mobile-menu__parent');
    var toggle = item.querySelector('.mobile-menu__toggle');
    var submenu = item.querySelector('.mobile-menu__submenu');

    if (parent && submenu && toggle) {
      toggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        var isOpen = submenu.style.display === 'block';

        if (isOpen) {
          submenu.style.display = 'none';
          toggle.textContent = '+';
          toggle.setAttribute('aria-expanded', 'false');
        } else {
          mobileMenuItems.forEach(function(otherItem) {
            if (otherItem === item) return;

            var otherToggle = otherItem.querySelector('.mobile-menu__toggle');
            var otherSubmenu = otherItem.querySelector('.mobile-menu__submenu');

            if (otherToggle && otherSubmenu) {
              otherSubmenu.style.display = 'none';
              otherToggle.textContent = '+';
              otherToggle.setAttribute('aria-expanded', 'false');
            }
          });
          submenu.style.display = 'block';
          toggle.textContent = '-';
          toggle.setAttribute('aria-expanded', 'true');
        }
      });
    }
  });
});
