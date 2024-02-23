import * as matchers from "vitest-dom/matchers";
import { describe, it, expect } from "vitest";
expect.extend(matchers);
import "vitest-dom/extend-expect";

import { JSONSchema7 } from "json-schema";
import { FoundCursorData, JSONHover } from "../json-hover.js";

import { EditorView } from "@codemirror/view";
import { testSchema, testSchema2 } from "./__fixtures__/schemas.js";
import { Draft } from "json-schema-library";
import { MODES } from "../constants.js";
import { JSONMode } from "../types.js";
import { getExtensions } from "./__helpers__/index.js";

const getHoverData = (
  jsonString: string,
  pos: number,
  mode: JSONMode,
  schema?: JSONSchema7
) => {
  const view = new EditorView({
    doc: jsonString,
    extensions: [getExtensions(mode, schema ?? testSchema)],
  });
  return new JSONHover({ mode }).getDataForCursor(view, pos, 1);
};

const getHoverResult = async (
  jsonString: string,
  pos: number,
  mode: JSONMode,
  schema?: JSONSchema7
) => {
  const view = new EditorView({
    doc: jsonString,
    extensions: [getExtensions(mode, schema ?? testSchema)],
  });
  const hoverResult = await new JSONHover({ mode }).doHover(view, pos, 1);
  return hoverResult;
};

const getHoverTexts = async (
  jsonString: string,
  pos: number,
  mode: JSONMode,
  schema?: JSONSchema7
) => {
  const view = new EditorView({
    doc: jsonString,
    extensions: [getExtensions(mode, schema ?? testSchema)],
  });
  const hover = new JSONHover({ mode });
  const data = hover.getDataForCursor(view, pos, 1) as FoundCursorData;
  const hoverResult = hover.getHoverTexts(data, schema as Draft);
  return hoverResult;
};

describe("JSONHover#getDataForCursor", () => {
  it.each([
    {
      mode: MODES.JSON,
      doc: '{"object": { "foo": true }, "bar": 123}',
      pos: 14,
      schema: testSchema2,
      expected: {
        pointer: "/object/foo",
        schema: {
          description: "an elegant string",
          type: "string",
        },
      },
    },
    {
      mode: MODES.JSON5,
      doc: "{object: { foo: true }, bar: 123}",
      pos: 11,
      schema: testSchema2,
      expected: {
        pointer: "/object/foo",
        schema: {
          description: "an elegant string",
          type: "string",
        },
      },
    },
    {
      mode: MODES.YAML,
      doc: `---
object:
  foo: true
bar: 123
`,
      pos: 14,
      schema: testSchema2,
      expected: {
        pointer: "/object/foo",
        schema: {
          description: "an elegant string",
          type: "string",
        },
      },
    },
  ])(
    "should return schema descriptions as expected (mode: $mode)",
    ({ mode, doc, pos, schema, expected }) => {
      expect(getHoverData(doc, pos, mode, schema)).toEqual(expected);
    }
  );
});

describe("JSONHover#getHoverTexts", () => {
  it.each([
    {
      name: "oneOf despite invalid values",
      mode: MODES.JSON,
      doc: '{"oneOfEg": { "foo": true }, "bar": 123}',
      pos: 3,
      schema: testSchema2,
      expected: {
        message: "an example oneOf",
        typeInfo: "oneOf: `string`, `array`, or `boolean`",
      },
    },
    {
      name: "oneOf with valid values",
      mode: MODES.JSON,
      doc: '{"oneOfEg": { "foo": "example" }, "bar": 123}',
      pos: 3,
      schema: testSchema2,
      expected: {
        message: "an example oneOf",
        typeInfo: "oneOf: `string`, `array`, or `boolean`",
      },
    },
  ])(
    "should return hover texts as expected ($name, mode: $mode)",
    async ({ mode, doc, pos, schema, expected }) => {
      expect(await getHoverTexts(doc, pos, mode, schema)).toEqual(expected);
    }
  );
});

describe("JSONHover#doHover", () => {
  it.each([
    {
      name: "",
      mode: MODES.JSON,
      doc: '{"object": { "foo": true }, "bar": 123}',
      pos: 14,
      schema: testSchema2,
      expected: {
        arrow: true,
        end: 14,
        pos: 14,
        above: true,
        create: expect.any(Function),
      },
      expectedHTMLContents: [
        [
          `<div class="cm6-json-schema-hover"><div class="cm6-json-schema-hover--description">an elegant string</div>`,
          `<div class="cm6-json-schema-hover--code-wrapper"><div class="cm6-json-schema-hover--code">string</div></div></div>`,
        ].join(""),
      ],
    },
    {
      name: "with no description",
      mode: MODES.JSON,
      doc: '{ "foo": true }',
      pos: 4,
      schema: testSchema,
      expected: {
        arrow: true,
        end: 4,
        pos: 4,
        above: true,
        create: expect.any(Function),
      },
      expectedHTMLContents: [
        "cm6-json-schema-hover--code-wrapper",
        "cm6-json-schema-hover--code",
        "string</code>",
      ],
    },
  ])(
    "should return Tooltip data ($name, mode: $mode)",
    async ({ mode, doc, pos, schema, expected, expectedHTMLContents }) => {
      const hoverResult = await getHoverResult(doc, pos, mode, schema);
      expect(hoverResult).toEqual(expected);
      const hoverEl = hoverResult?.create(new EditorView({})).dom;
      expectedHTMLContents.forEach((content) => {
        expect(hoverEl).toContainHTML(content);
      });
    }
  );
});
