// Front-left quarter views match the supplied presentation references.
export const viewDirections={front:[-.72,.32,-1.5],back:[1,.42,1.3],left:[-1.35,.32,-1.05],right:[1.35,.32,-1.05]};
export function partView(id, point){
 if(id===0||id===1||id===2)return 'front';
 if(id===3||id===4)return 'left';
 return point.z>.6?'back':point.x>.4?'right':point.x<-.5?'left':'front';
}
