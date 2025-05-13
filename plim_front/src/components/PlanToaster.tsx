import { Intent, OverlayToaster, Position } from "@blueprintjs/core";

/** Singleton toaster instance. Create separate instances for different options. */
export const PlanToaster = OverlayToaster.createAsync({
    className: "recipe-toaster",
    position: Position.TOP,
    maxToasts: 1,
});