import { BUSINESS } from "../lib/business-content";
import "./business-benefits-bento.css";

const cards = [
  { content: BUSINESS.benefits[0], name: "volume" },
  { content: BUSINESS.benefits[3], name: "crews" },
  { content: BUSINESS.benefits[2], name: "cost", dark: true },
  { content: BUSINESS.benefits[1], name: "time" },
  { content: BUSINESS.benefits[4], name: "factory", dark: true },
  { content: BUSINESS.benefits[5], name: "range" },
  { content: BUSINESS.partnership[1], name: "architecture", dark: true },
  { content: BUSINESS.partnership[2], name: "training" },
  { content: BUSINESS.partnership[3], name: "branding", dark: true },
] as const;

export function BusinessBenefitsBento() {
  return (
    <div className="business-benefits-bento">
      {cards.map(({ content: [title, description], name, ...card }, index) => (
        <article
          className={`business-benefit business-benefit--${name}${"dark" in card && card.dark ? " business-benefit--dark" : ""}`}
          key={name}
        >
          <span className="business-benefit__number" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
          <h3>{title}</h3>
          <p>{description}</p>
        </article>
      ))}
    </div>
  );
}
