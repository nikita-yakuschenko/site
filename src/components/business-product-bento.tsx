import type { ReactNode } from "react";
import Image from "next/image";
import {
  IconBuildingWarehouse,
  IconHome,
} from "@tabler/icons-react";
import materialImage from "../../public/img/cards/imitation2.png";
import trussImage from "../../public/img/pages/b2b_ferm.png";
import roofPanelImage from "../../public/img/pages/b2b_top_panel.png";
import modularImage from "../../public/img/pages/b2b_modular.png";
import { BUSINESS } from "../lib/business-content";

const ORDER = [
  "prefab",
  "modules",
  "trusses",
  "roof-panels",
  "precut",
] as const;

export function BusinessProductBento({
  materialsAction,
}: {
  materialsAction: ReactNode;
}) {
  return (
    <div className="business-product-bento">
      {ORDER.map((id) => {
        const product = BUSINESS.products.find((item) => item.id === id)!;
        const className = `company-bento__tile business-product-bento__tile business-product-bento__${id}`;
        const content = (
          <>
            <div className="business-product-bento__copy">
              <h3>{product.title}</h3>
              <p>
                {id === "prefab"
                  ? "Домокомплект из заводских панелей. Больше операций на производстве, меньше трудозатрат на участке."
                  : id === "trusses"
                    ? "Несущие конструкции для кровель, перекрытий и больших пролётов."
                    : product.description}
              </p>
            </div>
            <div
              className={`business-product-bento__image${product.image ? "" : " business-product-bento__image--placeholder"}`}
            >
              {product.image ? (
                <Image
                  src={
                    id === "trusses"
                      ? trussImage
                      : id === "roof-panels"
                        ? roofPanelImage
                        : id === "modules"
                          ? modularImage
                        : product.image
                  }
                  alt=""
                  fill
                  quality={90}
                  sizes={
                    id === "prefab"
                      ? "(max-width: 719px) 70vw, 384px"
                      : "(max-width: 719px) 70vw, 320px"
                  }
                />
              ) : (
                <div className="business-product-bento__placeholder">
                  {id === "trusses" ? (
                    <IconBuildingWarehouse
                      size={40}
                      stroke={1.2}
                      aria-hidden="true"
                    />
                  ) : (
                    <IconHome size={40} stroke={1.2} aria-hidden="true" />
                  )}
                  <span>Изображение готовится</span>
                </div>
              )}
            </div>
          </>
        );
        return (
          <article key={id} className={className}>
            {content}
          </article>
        );
      })}
      <article className="company-bento__tile business-product-bento__materials">
        <div className="business-product-bento__copy">
          <h3>Сопутствующие строительные материалы</h3>
          <p>
            Окрашенная имитация бруса и планкен, утеплители, кровельные
            материалы, котлы и другие позиции. Состав поставки согласовываем под
            ваш проект.
          </p>
          {materialsAction}
        </div>
        <div className="business-product-bento__image">
          <Image
            src={materialImage}
            alt="Окрашенная деревянная отделка"
            fill
            sizes="(max-width: 719px) 70vw, 320px"
          />
        </div>
      </article>
    </div>
  );
}
