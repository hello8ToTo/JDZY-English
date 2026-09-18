// Keep the label on the anchor's side, even when the opposite side is roomier.
export function nearbyCallout(bounds, anchor, size, viewport, preferredSide) {
 const padding=12,gap=24;
 const clamp=(value,min,max)=>Math.max(min,Math.min(value,Math.max(min,max)));
 const middle=(bounds.left+bounds.right)/2;
 const left=preferredSide?preferredSide==='left':anchor.x<=middle;
 const x=left?bounds.left-size.width-gap:bounds.right+gap;
 // Bias toward the middle of the car instead of the bottom controls.
 const middleY=(bounds.top+bounds.bottom)/2;
 const headerY=anchor.y*.45+middleY*.55;
 return {
  x:clamp(x,padding,viewport.width-size.width-padding),
  y:clamp(headerY-24,padding,viewport.height-size.height-100),
  side:left?'left':'right'
 };
}

export function leaderEndpoint(anchor, box) {
 const left=box.x,right=box.x+box.width;
 return {x:anchor.x<left?left:anchor.x>right?right:anchor.x,y:box.y+24};
}
