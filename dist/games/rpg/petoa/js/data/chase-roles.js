export const ROLE_NAMES = { shield: '盾になって止める', lure: '囮になって引きつける' };
export const MEMBER_NAMES = { mados: 'マドス', iria: 'イリア' };
// Individual strengths: Mados holds his ground; Iria deploys and returns quickly.
export const ROLE_STATS = {
  mados: {
    shield: { duration: 8, cooldown: 20, speed: 210, returnSpeed: 285, radius: 110, capacity: 1, linger: 3 },
    lure: { duration: 7, cooldown: 20, speed: 210, returnSpeed: 285, radius: 520, linger: 6 },
  },
  iria: {
    shield: { duration: 4, cooldown: 12, speed: 300, returnSpeed: 340, radius: 90, capacity: 1, linger: 2 },
    lure: { duration: 6, cooldown: 14, speed: 300, returnSpeed: 340, radius: 360, linger: 4 },
  },
};
export function validRoles(roles) {
  return roles && ['shield', 'lure'].includes(roles.mados) && ['shield', 'lure'].includes(roles.iria) && roles.mados !== roles.iria;
}
