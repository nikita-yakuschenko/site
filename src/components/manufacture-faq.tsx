"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";

const projectQuestions = [
  {
    question: "У меня свой проект. Можете произвести по нему дом?",
    answer:
      "Технически это возможно, однако понадобится время на разработку комплекта документации, поскольку дом нестандартный. Свяжитесь с нами любым удобным способом, мы открыты к диалогу.",
  },
  {
    question: "Можно ли сделать перепланировку и какие вообще изменения можно вносить в проект?",
    answer:
      "Возможность каждого изменения зависит от конкретного проекта, технологии и характера желаемых изменений, сообщите свои пожелания менеджеру, наши инженеры всё проверят и предложат решение",
  },
];

const preparationQuestions = [
  {
    question: "Как изготавливаются детали каркаса?",
    answer:
      "На балочном центре WEINMANN WBZ 150 мы раскраиваем пиломатериал камерной сушки по конструкторской документации. Станок выполняет распил, сверление и фрезеровку, предусмотренные проектом.",
  },
  {
    question: "Зачем нужны плитные материалы и как они обрабатываются?",
    answer:
      "В первую очередь плитные материалы нужны для жесткости конструкции панелей, чтобы они сохраняли свою геометрию при перевозке, кроме того ориентированно-стружечные плиты OSB-3 выступают черновым напольным покрытием, а гипсо-стружечные плиты Vetonit GTS служат ветрозащитным барьером",
  },
  {
    question: "Как красятся отделочные материалы",
    answer:
      "Такие фасадные и интерьерные отделочные материалы как имитация бруса и планкен, террасная (палубная) доска, элементы ограждений, столбы и др. окрашиваются на специальных портальных покрасочных линиях",
  },
];

const questions = [
  {
    question: "Чем отличается производство панельно-каркасного и модульного дома?",
    answer:
      "До момента окончания производства панелей технологии абсолютно идентичны. Различие начинается после того как панели готовы, в случае с панельным домом - производство завершено, он готов к отправке, а вот производство модульного дома только начинается, он отправляется на участок сборки, где панели собирают в объёмные модули.",
  },
  {
    question: "Сколько времени занимает сборка дома на участке?",
    answer:
      "Всё зависит от проекта и доступности участка. Время монтажа домокомплектов по большинству проектов укладывается в 48-72 часа, всё зависит от конкретных условий, короткий световой день в зимнее время, проливной дождь или обильный снегопад могут немного увеличить время сборки",
  },
  {
    question: "В каком состоянии дом передают после сборки?",
    answer:
      "На это влияет технология и комплектация, по общему правилу модульный дом после сборки готов к проживанию, а панельно-каркасный дом передаётся в готовности к прокладке коммуникаций, электрики, установке сантехники и отделочным работам. Комплектация в вашем случае может предусматривать другое состояние, уточните эту информацию у своего менеджера",
  },
];

export function ManufactureProjectQuestions() {
  return (
    <div className="manufacture-docs__questions">
      <h3 className="mortgage-rules__title">Вопросы о проекте</h3>
      <Accordion type="multiple" defaultValue={[]} className="ui-accordion mortgage-rules manufacture-questions">
        {projectQuestions.map((item, index) => (
          <AccordionItem key={item.question} value={`manufacture-project-${index}`}>
            <AccordionTrigger>{item.question}</AccordionTrigger>
            <AccordionContent>{item.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

export function ManufacturePreparationQuestions() {
  return (
    <div className="manufacture-prep__questions">
      <h3 className="mortgage-rules__title">Вопросы о подготовке деталей</h3>
      <Accordion type="multiple" defaultValue={[]} className="ui-accordion mortgage-rules manufacture-questions">
        {preparationQuestions.map((item, index) => (
          <AccordionItem key={item.question} value={`manufacture-preparation-${index}`}>
            <AccordionTrigger>{item.question}</AccordionTrigger>
            <AccordionContent>{item.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

export function ManufactureFaq() {
  return (
    <section className="section manufacture-faq" aria-labelledby="manufacture-faq-title">
      <div className="section__inner">
        <h2 id="manufacture-faq-title">Частые вопросы</h2>
        <Accordion type="multiple" defaultValue={[]} className="ui-accordion mortgage-faq manufacture-questions">
          {questions.map((item, index) => (
            <AccordionItem key={item.question} value={`manufacture-faq-${index}`}>
              <AccordionTrigger>{item.question}</AccordionTrigger>
              <AccordionContent>{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
