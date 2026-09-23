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
      "Технически это возможно, однако понадобится время на разработку комплекта документации, поскольку дом нестандартный. Если вы готовы покрыть расходы на проектирование, мы открыты к диалогу. Другой путь - серийное или мелкосерийное производство. Если вы закажете от 10 типовых домов, мы возьмём разработку документации на себя.",
  },
  {
    question: "Можете сделать перепланировку?",
    answer:
      "Перепланировку можно обсудить до подготовки конструкторской документации. Проектировщики проверят, как изменения повлияют на конструкцию и инженерные сети, после чего предложат решение.",
  },
  {
    question: "Какие изменения можно вносить в проект?",
    answer:
      "Можно обсудить планировку, расположение окон и дверей, инженерные сети и отделку. Возможность каждого изменения зависит от конструкции дома и выбранной технологии, поэтому сначала проверим ваш запрос по проекту.",
  },
];

const preparationQuestions = [
  {
    question: "Как готовят детали каркаса?",
    answer:
      "На балочном центре WEINMANN WBZ 150 раскраиваем деревянные заготовки по конструкторской документации. Станок выполняет распил, отверстия и выборки, предусмотренные проектом.",
  },
  {
    question: "Как готовят обшивки?",
    answer:
      "На вертикальном форматно-раскроечном станке SVP 950 ECO раскраиваем листовые материалы по размерам из конструкторской документации. Так получаем детали обшивки для стен, перекрытий и кровли.",
  },
  {
    question: "Зачем маркируют детали?",
    answer:
      "После раскроя детали маркируют, чтобы при сборке их можно было быстро найти и установить на нужное место.",
  },
];

const questions = [
  {
    question: "Чем отличается производство панельно-каркасного и модульного дома?",
    answer:
      "После сборки панелей пути расходятся. Панельно-каркасный домокомплект отправляют на склад готовой продукции. Для модульного дома из панелей собирают модули и продолжают работы внутри них.",
  },
  {
    question: "Что делают внутри модулей на производстве?",
    answer:
      "Прокладывают коммуникации и электрику, укладывают напольное покрытие, выполняют отделку. В мокрых зонах делают гидроизоляцию, укладывают керамогранит и устанавливают сантехнику. Затем модули доукомплектовывают и упаковывают.",
  },
  {
    question: "Как домокомплект попадает на участок?",
    answer:
      "Перед началом строительства конструкции отгружают со склада и доставляют заказчику. Панели перевозят фурой, модули низкорамным тралом.",
  },
  {
    question: "Сколько времени занимает сборка дома на участке?",
    answer:
      "По прибытии конструкции разгружают и с помощью крана за несколько дней собирают дом.",
  },
  {
    question: "В каком состоянии дом передают после сборки?",
    answer:
      "Модульный дом после сборки готов к проживанию. Панельно-каркасный дом передают в готовности к прокладке коммуникаций, электрики, установке сантехники и отделочным работам.",
  },
];

export function ManufactureProjectQuestions() {
  return (
    <div className="manufacture-docs__questions">
      <h3 className="mortgage-rules__title">Вопросы о проекте</h3>
      <Accordion type="multiple" defaultValue={[]} className="ui-accordion mortgage-rules">
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
      <Accordion type="multiple" defaultValue={[]} className="ui-accordion mortgage-rules">
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
        <Accordion type="multiple" className="ui-accordion mortgage-faq">
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
