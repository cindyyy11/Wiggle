// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { guideTipFor } from "./wiggleGuide";

afterEach(() => { document.body.innerHTML = ""; });

function mount(html: string): Element {
  document.body.innerHTML = html;
  return document.body.firstElementChild as Element;
}

describe("guideTipFor", () => {
  it("explains known controls by their accessible label", () => {
    expect(guideTipFor(mount('<button aria-label="Back to Worlds">Back to Worlds</button>'))).toMatch(/map of all the planets/);
    expect(guideTipFor(mount("<button>Run</button>"))).toMatch(/walk faster/);
    expect(guideTipFor(mount('<button title="Run: walk faster">Run</button>'))).toMatch(/walk faster/);
    expect(guideTipFor(mount('<button aria-label="Visit Number Valley">x</button>'))).toMatch(/count/);
  });

  it("uses the closest control when an icon inside it is the target", () => {
    const button = mount('<button aria-label="Zoom in"><svg><path /></svg></button>');
    expect(guideTipFor(button.querySelector("path"))).toMatch(/closer/);
  });

  it("prefers an explicit data-wiggle-tip and stays quiet for unknown controls", () => {
    expect(guideTipFor(mount('<button data-wiggle-tip="Hello there">Anything</button>'))).toBe("Hello there");
    expect(guideTipFor(mount("<button>Something unknown</button>"))).toBeNull();
    expect(guideTipFor(mount("<p>Plain text</p>"))).toBeNull();
  });
});
