import type {
  ExpressionSpecification,
  LayerSpecification,
  StyleSpecification,
} from "maplibre-gl";

const HAS_NON_LATIN_NAME = JSON.stringify(["has", "name:nonlatin"]);
const LATIN_NAME: ExpressionSpecification = ["get", "name:latin"];

function keepLatinLabel(layer: LayerSpecification): LayerSpecification {
  if (layer.type !== "symbol") return layer;
  const textField: unknown = layer.layout?.["text-field"];
  if (
    !Array.isArray(textField) ||
    textField[0] !== "case" ||
    JSON.stringify(textField[1]) !== HAS_NON_LATIN_NAME
  ) {
    return layer;
  }
  const [, condition, , fallback] = textField;
  return {
    ...layer,
    layout: {
      ...layer.layout,
      "text-field": ["case", condition, LATIN_NAME, fallback],
    },
  };
}

export function keepLatinLabels(style: StyleSpecification): StyleSpecification {
  return { ...style, layers: style.layers.map(keepLatinLabel) };
}
