const nav = document.querySelector('.faq-section-nav');
const container = document.querySelector('#faq-sections');

function parseFaq(source) {
  const sections = [];
  let section = null;
  let subsection = null;
  let question = null;
  let answerStarted = false;

  for (const rawLine of source.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = rawLine.trim();
    const sectionMatch = line.match(/^Раздел\s*[-–—]\s*(.+)$/i);
    const subsectionMatch = line.match(/^Подраздел\s*[-–—]\s*(.+)$/i);
    const questionMatch = line.match(/^\d+\.\s*Вопрос:\s*(.*)$/i);
    const answerMatch = line.match(/^Ответ:\s*(.*)$/i);

    if (sectionMatch) {
      section = { title: sectionMatch[1].trim(), questions: [], subsections: [] };
      sections.push(section);
      subsection = null;
      question = null;
      answerStarted = false;
      continue;
    }
    if (subsectionMatch) {
      subsection = { title: subsectionMatch[1].trim(), questions: [] };
      if (!section) {
        section = { title: 'Вопросы и ответы', questions: [], subsections: [] };
        sections.push(section);
      }
      section.subsections.push(subsection);
      question = null;
      answerStarted = false;
      continue;
    }
    if (questionMatch) {
      question = { title: questionMatch[1].trim(), answer: [] };
      if (!section) {
        section = { title: 'Вопросы и ответы', questions: [], subsections: [] };
        sections.push(section);
      }
      (subsection?.questions || section.questions).push(question);
      answerStarted = false;
      continue;
    }
    if (answerMatch && question) {
      answerStarted = true;
      if (answerMatch[1]) question.answer.push(answerMatch[1]);
      continue;
    }
    if (answerStarted && question) question.answer.push(line);
  }
  return sections.filter(item => item.questions.length || item.subsections.some(group => group.questions.length));
}

function appendAnswerList(parent, listType, lines) {
  const list = document.createElement(listType);
  lines.forEach(text => {
    const item = document.createElement('li');
    item.textContent = text;
    list.append(item);
  });
  parent.append(list);
}

function renderAnswer(parent, lines) {
  let paragraph = [];
  let listType = null;
  let listLines = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const text = paragraph.join('\n');
    const label = text.match(/^(Способы применения|Важные предупреждения|Оплата|Скидка по объему флакончика):$/i);
    const element = document.createElement(label ? 'h4' : 'p');
    if (label) element.className = 'faq-answer-label';
    element.textContent = text;
    parent.append(element);
    paragraph = [];
  };
  const flushList = () => {
    if (!listLines.length) return;
    appendAnswerList(parent, listType, listLines);
    listType = null;
    listLines = [];
  };

  for (const line of lines) {
    const warning = line.match(/^(ВАЖНО!?|Важно!?)[ \t]*(.*)$/i);
    const bullet = line.match(/^•\s*(.*)$/);
    const numberedStep = line.match(/^\d+\s+способ\.\s*(.*)$/i);
    const nextListType = bullet ? 'ul' : numberedStep ? 'ol' : null;
    if (warning) {
      flushParagraph();
      flushList();
      const callout = document.createElement('aside');
      callout.className = 'faq-warning';
      const label = document.createElement('strong');
      label.textContent = 'Важно!';
      callout.append(label);
      if (warning[2]) {
        const text = document.createElement('p');
        text.textContent = warning[2];
        callout.append(text);
      }
      parent.append(callout);
      continue;
    }
    if (nextListType) {
      flushParagraph();
      if (listType && listType !== nextListType) flushList();
      listType = nextListType;
      listLines.push(bullet ? bullet[1] : numberedStep[1]);
      continue;
    }
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    flushList();
    paragraph.push(line);
    flushParagraph();
  }
  flushParagraph();
  flushList();
}

function renderQuestion(item) {
  const details = document.createElement('details');
  details.className = 'faq-item';
  const summary = document.createElement('summary');
  summary.textContent = item.title;
  const answer = document.createElement('div');
  answer.className = 'faq-answer';
  renderAnswer(answer, item.answer);
  details.append(summary, answer);
  return details;
}

function renderSectionContents(sectionElement, section) {
  section.questions.forEach(item => sectionElement.append(renderQuestion(item)));
  section.subsections.forEach(subsection => {
    const heading = document.createElement('h3');
    heading.className = 'faq-subsection-title';
    heading.textContent = subsection.title;
    sectionElement.append(heading);
    subsection.questions.forEach(item => sectionElement.append(renderQuestion(item)));
  });
}

function render(sections) {
  nav.replaceChildren();
  container.replaceChildren();
  sections.forEach((section, index) => {
    const id = `faq-section-${index + 1}`;
    const link = document.createElement('a');
    link.href = `#${id}`;
    link.textContent = section.title;
    nav.append(link);

    const sectionElement = document.createElement('section');
    sectionElement.className = 'faq-section';
    sectionElement.id = id;
    const heading = document.createElement('h2');
    heading.id = `${id}-title`;
    heading.textContent = section.title;
    sectionElement.setAttribute('aria-labelledby', heading.id);
    sectionElement.append(heading);
    renderSectionContents(sectionElement, section);
    container.append(sectionElement);
  });
}

if (window.BAHUR_FAQ_SOURCE) render(parseFaq(window.BAHUR_FAQ_SOURCE));

fetch('../faq.txt', { cache: 'no-store' })
  .then(response => {
    if (!response.ok) throw new Error(`FAQ source returned ${response.status}`);
    return response.text();
  })
  .then(text => render(parseFaq(text)))
  .catch(error => console.error('Не удалось загрузить FAQ из faq.txt', error));
