// Функция за създаване на колоните с опции
import { renderCalendar } from './calendar.js';

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
      <div class="options-buttons">
        <button class="back-button">Назад</button>
        <button class="swap-button">Размени</button>
      </div>
    `;
  
    // Добавяме новия панел към контейнера
    container.appendChild(panel);
  
    // Добавяме event listeners за бутоните
    const backButton = panel.querySelector('.back-button');
    const continueButton = panel.querySelector('.swap-button');

    backButton.addEventListener('click', () => {
      // Запазваме избраните опции
      const selectedOptions = {
        night: document.querySelector('input[name="night"]:checked')?.value,
        shift: document.querySelector('input[name="shift"]:checked')?.value,
        extra: document.querySelector('input[name="extra"]:checked')?.value
      };

      // Добавяме анимация за изчезване
      panel.classList.add('slide-out-left');
      
      // След края на анимацията премахваме панела и показваме календара
      const handleAnimationEnd = () => {
        // Премахваме панела
        panel.remove();
        
        // Проверяваме дали имаме кеширани данни за календара
        const cachedCalendarData = sessionStorage.getItem('calendarData');
        
        if (cachedCalendarData) {
          const calendarData = JSON.parse(cachedCalendarData);
          
          // Създаваме контейнера за календара
          const calendarContainer = document.createElement('div');
          calendarContainer.id = 'calendar';
          calendarContainer.classList.add('slide-in');
          
          // Добавяме контейнера към DOM
          document.querySelector('.main-content').appendChild(calendarContainer);
          
          // Рендерираме календара
          renderCalendar(
            calendarData.year,
            calendarData.month,
            userName,
            calendarData.monthName,
            calendarData.options,
            calendarData.weights,
            calendarData.pinLimit,
            calendarData.pinLimitEnabled,
            calendarData.disabledDays || []
          );
          
          // Връщаме избраните опции в sessionStorage
          sessionStorage.setItem('selectedOptions', JSON.stringify(selectedOptions));
        } else {
          // Ако нямаме кеширани данни, правим заявка към API-то
          fetch('/api/getCalendar')
            .then(res => {
              if (!res.ok) {
                throw new Error('Network response was not ok');
              }
              return res.json();
            })
            .then(calendarData => {
              // Кешираме данните за календара
              sessionStorage.setItem('calendarData', JSON.stringify(calendarData));
              
              // Създаваме контейнера за календара
              const calendarContainer = document.createElement('div');
              calendarContainer.id = 'calendar';
              calendarContainer.classList.add('slide-in');
              
              // Добавяме контейнера към DOM
              document.querySelector('.main-content').appendChild(calendarContainer);
              
              // Рендерираме календара
              renderCalendar(
                calendarData.year,
                calendarData.month,
                userName,
                calendarData.monthName,
                calendarData.options,
                calendarData.weights,
                calendarData.pinLimit,
                calendarData.pinLimitEnabled,
                calendarData.disabledDays || []
              );
              
              // Връщаме избраните опции в sessionStorage
              sessionStorage.setItem('selectedOptions', JSON.stringify(selectedOptions));
            })
            .catch(error => {
              console.error('Error:', error);
              showNotification('Възникна грешка при зареждането на календара.');
            });
        }
      };

      // Добавяме event listener за анимацията
      panel.addEventListener('animationend', handleAnimationEnd, { once: true });
      
      // Добавяме fallback timeout за случай, че анимацията не се задейства
      setTimeout(handleAnimationEnd, 500);
    });

    continueButton.addEventListener('click', () => {
      // Тук ще добавим логиката за продължаване
      // За сега само показваме съобщение
      showNotification('Функционалността за продължаване ще бъде добавена скоро.');
    });

    // Изтриваме старите елементи веднага
    if (oldCalendar) oldCalendar.remove();
    if (oldSummary) oldSummary.remove();
  }
  