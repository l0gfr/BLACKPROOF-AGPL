import { describe, expect, it } from "vitest";

import { astroIslandInlineStyle, cleanupBuiltHtml } from "../../build-cleanup.mjs";
import { GET as getQuestionnaireCrusherSample } from "../pages/questionnaire-crusher.json";
import { GET as getProofPackDeliveryDemoZip } from "../pages/demo/proofpack-delivery-demo.zip";

async function responseBytes(response: Response): Promise<Uint8Array> {
  return new Uint8Array(await response.arrayBuffer());
}

describe("prerendered public artifact reproducibility", () => {
  it("removes build-path-dependent Astro island identifiers", () => {
    const html = [
      "<!doctype html>",
      astroIslandInlineStyle,
      '<astro-island uid="machine-dependent" component-url="/_astro/editor.js" ssr>',
      '<p data-uid="customer-value">Dossier</p>',
      "</astro-island>",
    ].join("");

    expect(cleanupBuiltHtml(html)).toBe(
      '<!doctype html><astro-island component-url="/_astro/editor.js" ssr>'
      + '<p data-uid="customer-value">Dossier</p></astro-island>',
    );
  });

  it("keeps the Questionnaire Crusher sample identifiers stable", async () => {
    const first = getQuestionnaireCrusherSample();
    const second = getQuestionnaireCrusherSample();
    const firstText = await first.text();
    const secondText = await second.text();

    expect(secondText).toBe(firstText);
    const sample = JSON.parse(firstText);
    expect(sample.sampleReport.diagnostics.map((item: { id: string }) => item.id)).toEqual([
      "qd_sample_0001",
      "qd_sample_0002",
      "qd_sample_0003",
      "qd_sample_0004",
    ]);
  });

  it("produces byte-identical Delivery demo ZIP archives", async () => {
    const first = await responseBytes(await getProofPackDeliveryDemoZip());
    const second = await responseBytes(await getProofPackDeliveryDemoZip());

    expect(second).toEqual(first);
  });
});
