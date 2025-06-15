document.addEventListener('DOMContentLoaded', () => {
  const accordionItems = document.querySelectorAll('.accordion-item');
  
  accordionItems.forEach(item => {
    const button = item.querySelector('.accordion-button');
    const content = item.querySelector('.accordion-content');
    const icon = button.querySelector('i');
    
    button.classList.add('collapsed');
    icon.classList.add('fa-plus');
    
    button.addEventListener('click', () => {
      const isCollapsed = button.classList.contains('collapsed');
      
      // Fecha todos os outros itens antes de abrir o novo
      accordionItems.forEach(otherItem => {
        if (otherItem !== item) {
          otherItem.querySelector('.accordion-button').classList.add('collapsed');
          otherItem.querySelector('.accordion-content').style.maxHeight = null;
          const otherIcon = otherItem.querySelector('.accordion-button i');
          otherIcon.classList.remove('fa-minus');
          otherIcon.classList.add('fa-plus');
        }
      });
      
      // Abre ou fecha o item clicado
      if (isCollapsed) {
        button.classList.remove('collapsed');
        content.style.maxHeight = content.scrollHeight + 'px';
        icon.classList.remove('fa-plus');
        icon.classList.add('fa-minus');
      } else {
        button.classList.add('collapsed');
        content.style.maxHeight = null;
        icon.classList.remove('fa-minus');
        icon.classList.add('fa-plus');
      }
    });
  });
});