import { useTranslation } from "react-i18next";
import alipayCode from "./assets/Alipay.jpg";
import weChatPayCode from "./assets/WeChatPay.jpg";
import { FloatingToolPanel } from "../shared/FloatingToolPanel";
import "./SponsorshipPanel.css";

interface SponsorshipPanelProps {
  readonly expanded?: boolean;
  readonly onExpandedChange?: (expanded: boolean) => void;
}

export function SponsorshipPanel({
  expanded = false,
  onExpandedChange = () => undefined,
}: SponsorshipPanelProps) {
  const { t } = useTranslation();

  return (
    <FloatingToolPanel
      className="sponsorship-display"
      closeLabel={t("closeSponsorship")}
      expanded={expanded}
      id="sponsorship-panel"
      label={t("sponsorship")}
      onExpandedChange={onExpandedChange}
      tone="brand"
      triggerId="sponsorship-trigger"
    >
      <div className="sponsorship-body">
        <div className="sponsorship-codes">
          <figure className="sponsorship-code">
            <figcaption>{t("alipay")}</figcaption>
            <a
              aria-label={t("saveAlipayPaymentCode")}
              className="sponsorship-code-link"
              download="PokeRNGKit-Alipay.jpg"
              href={alipayCode}
              title={t("saveAlipayPaymentCode")}
            >
              <img
                alt={t("alipayPaymentCode")}
                decoding="async"
                height="1708"
                src={alipayCode}
                width="1708"
              />
            </a>
          </figure>
          <figure className="sponsorship-code">
            <figcaption>{t("wechatPay")}</figcaption>
            <a
              aria-label={t("saveWechatPayPaymentCode")}
              className="sponsorship-code-link"
              download="PokeRNGKit-WeChatPay.jpg"
              href={weChatPayCode}
              title={t("saveWechatPayPaymentCode")}
            >
              <img
                alt={t("wechatPayPaymentCode")}
                decoding="async"
                height="500"
                src={weChatPayCode}
                width="500"
              />
            </a>
          </figure>
        </div>
      </div>
    </FloatingToolPanel>
  );
}
