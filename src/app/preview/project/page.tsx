import type { Metadata } from "next";
import { ProjectPreview } from "../../../components/preview/project-preview";
import { SiteChrome } from "../../../components/site-chrome";
import { footerAboutFor } from "../../../lib/copy";
import { SITE } from "../../../lib/site";

/**
 * Макет страницы проекта.
 *
 * Отдельный адрес, а не правка боевой страницы: здесь показано, как может
 * быть устроена карточка дома, пока решение не принято. Ничего из этого
 * не подключено к каталогу и не влияет на существующие страницы.
 *
 * Данные взяты у «Барнхауса 76», но разложены руками: в каталоге все кадры
 * лежат одним списком «экстерьеры», а планировки и интерьеры пустые. Для
 * макета раскладка нужна, для боевой страницы её придётся сделать по всем
 * 37 проектам.
 */
export const metadata: Metadata = {
  title: "Макет страницы проекта",
  robots: { index: false, follow: false },
};

export default function ProjectPreviewPage() {
  return (
    <SiteChrome
      name={SITE.name}
      phone={SITE.contacts.phone}
      email={SITE.contacts.email}
      address={SITE.contacts.address}
      navigation={[...SITE.navigation]}
      overlay={false}
      footer={SITE.footer.legal}
      about={footerAboutFor(SITE.name)}
    >
      <main>
        <ProjectPreview />
      </main>
    </SiteChrome>
  );
}
