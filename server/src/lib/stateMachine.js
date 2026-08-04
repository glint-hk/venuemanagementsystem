import { transitions } from "../../../shared/index.js";

/**
 * Returns true when the from → to pair is listed in shared/stateMachine.js.
 */
export function isValidTransition(fromStatus, toStatus) {
  return transitions.some((t) => t.from === fromStatus && t.to === toStatus);
}

/**
 * @throws {{ status: number, message: string }} when the transition is illegal
 */
export function assertTransition(fromStatus, toStatus) {
  if (!isValidTransition(fromStatus, toStatus)) {
    throw {
      status: 400,
      message: `Invalid status transition: ${fromStatus} → ${toStatus}`,
    };
  }
}
