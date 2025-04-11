// Функция за създаване на колоните с опции
function createOptionColumn(title, optionValues, group) {
    let html = `<div class="option-column"><h3>${title}</h3><div class="option-list">`;
  
    for (const opt of optionValues) {
      const id = `${group}-${opt}`;
      html += `
        <input type="radio" name="${group}" id="${id}" value="${opt}">
        <label for="${id}">${opt}</label>
      `;
    }
  
    html += '</div></div>';
    return html;
  }
  
  // Главната функция за показване на панела с опции
  export async function showWorkPreferencesPanel(userName) {
    // Извикваме API-то, за да получим данните
    const response = await fetch('/api/getOptions');
    const options = await response.json();
  
    // Намираме контейнера за съдържанието
    const container = document.querySelector('.main-content');
    const oldCalendar = document.getElementById('calendar');
    const oldSummary = document.getElementById('summary-panel');
  
    // Добавяме анимацията за изчезване на старите панели
    if (oldCalendar) oldCalendar.classList.add('slide-out-left');
    if (oldSummary) oldSummary.classList.add('slide-out-left');
  
    // Създаваме новия панел
    const panel = document.createElement('div');
    panel.id = 'work-preferences-panel';
    panel.classList.add('slide-in');
  
    // Форматираме името с главна буква
    const nameCapitalized = userName.charAt(0).toUpperCase() + userName.slice(1).toLowerCase();
  
    // Вмъкваме съдържанието за панела
    panel.innerHTML = `
      <h2>Здравей, ${nameCapitalized}!</h2>
      <p>Моля изберете начина си на работа.</p>
      <div class="options-columns">
        ${createOptionColumn('Брой нощни:', options.nightCounts, 'night')}
        ${createOptionColumn('Вид смени:', options.shiftTypes, 'shift')}
        ${options.extraEnabled ? createOptionColumn('Екстра смени:', ['Да', 'Не'], 'extra') : ''}
      </div>
    `;
  
    // Добавяме новия панел към контейнера
    container.appendChild(panel);
  
    // Изтриваме старите след анимацията
    setTimeout(() => {
      if (oldCalendar) oldCalendar.remove();
      if (oldSummary) oldSummary.remove();
    }, 500);
  }
  