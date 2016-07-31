interface Diff {
  additions: number[],  // indices referring to the new state
  deletions: number[],  // indices referring to the old state
  // first index (from) in the pair refers to old state
  // second index (to) the the pair refers to the new state
  moves: [number, number][] 
}

/**
 * parent.childNodes[i] will become parent.childNodes[j] after the move.
 */
function moveInDom(parentElement: Element, from: number, to: number) {
  if (from == to) return;
  let el = parentElement.childNodes[from];
  let offset = from < to ? 1 : 0;
  parentElement.insertBefore(el, parentElement.childNodes[to + offset]);  
}

/**
 * Element parent.childNodes[idx] will be removed.
 */
function deleteInDom(parentElement: Element, idx: number) {
  parentElement.removeChild(parentElement.childNodes[idx]);
}

/** 
 * New element will be parent.childNodes[idx] after the move.
 */
function addInDom(parentElement: Element, idx: number) {
  let el = document.createElement('div');
  el.textContent = 'new,';
  parentElement.insertBefore(el, parentElement.childNodes[idx]);
}

/**
 * Applies the transformations described by the diff to the
 * children of parentElement.
 * 
 * Assumption for the diff:
 * - deletion are in decreasing order
 * - additions are in increasing order
 * - moves are sorted in 'to' increasing order
 * 
 * Moves are performed by a single insertAfter operation.
 */
export function applyDiff(diff: Diff, parentElement: Element) {
  // The "trick" - we need to keep track of elements that seem unmoved.
  // This would be more efficient if the Diff interface already contain the missing info.
  let newLength = parentElement.childNodes.length - diff.deletions.length + 
      diff.additions.length;
  let movesIdx = 0;
  for (let idx = 0; idx < newLength; idx++) {
    if (movesIdx < diff.moves.length && diff.moves[movesIdx][1] == idx) {
      movesIdx++;
    } else {
      if (diff.additions.indexOf(idx) == -1) {
        diff.moves.splice(movesIdx, 0, [idx, idx]);
        movesIdx++;
      }
    }
  }

  // Apply deletions in the right order not to need any deletion idx modifications.
  for (let i = diff.deletions.length - 1; i >= 0; i--) {
    let delIdx = diff.deletions[i];
    deleteInDom(parentElement, delIdx);
    // update "moves from" after each move.
    for (let j = 0; j < diff.moves.length; j++) {
      let [from, _] = diff.moves[j];
      if (from > delIdx) diff.moves[j][0] -= 1; 
    }
  }

  // Apply moves.
  for (let i = 0; i < diff.moves.length; i++) {
    let [from, to] = diff.moves[i];
    moveInDom(parentElement, from, to);

    // update the next moves.
    for (let j = i + 1; j < diff.moves.length; j++) {
      let [futureFrom, futureTo] = diff.moves[j];
      if (from <= futureFrom && futureFrom <= to) diff.moves[j][0] -= 1;
      if (from >= futureFrom && futureFrom >= to) diff.moves[j][0] += 1;
      // no "move to" modification needed because of expected ordering.
    }
  }

  // Apply additions in the right order not to need any addition idx modifications.
  for (let i = 0; i < diff.additions.length; i++) {
    addInDom(parentElement, diff.additions[i]);
  }
}

/**
 * Downside of applyDiff is that it can do n moves when a much smaller 
 * number will suffice.
 * For example, a swap of first and last elements will trigger n moves.
 * 
 * The algorithm below looks closer to optimal (proof needed).
 *  
 * However, the algorithm below only works on pure permutations - no additions / deletions.
 * Probably can be extended if additions and deletions are treated as moves of
 * synthetic elements.
 */
type Cycle = number[];
function getPermutationCycles(diff: Diff): Cycle[] {
  let pmap: {[from: number]: number} = {};
  for (let [from, to] of diff.moves) pmap[from] = to;
  let curFrom: number;
  let curTo: number;
  let cycles: Cycle[] = [];
  while (Object.keys(pmap).length > 0) {
    let cycle: Cycle = [];
    curFrom = parseInt(Object.keys(pmap)[0]);
    curTo = pmap[curFrom];
    while (cycle.indexOf(curFrom) == -1) {
      cycle.push(curFrom);
      delete pmap[curFrom];
      curFrom = curTo;
      if (pmap[curFrom]) {
        curTo = pmap[curFrom];
      } else {
        break;
      } 
    }
    cycles.push(cycle);
  }
  return cycles;
}

export function fastApplyPermutationDiff(diff: Diff, parentElement: Element) {
  let cycles = getPermutationCycles(diff);

  let cyclesItems: Node[][] = [];
  let cyclesOffsets: boolean[][] = [];

  // reading all items before any modifications.
  for (let c of cycles) {
    let cycleItems: Node[] = [];
    let cycleOffsets: boolean[] = [];
    for (let i = 0; i < c.length; i++) {
      let prevIdx = i == 0 ? c[c.length - 1] : c[i - 1]; 
      cycleItems.push(parentElement.childNodes[prevIdx]);
      cycleOffsets.push(c[i] < prevIdx);
    }
    cyclesItems.push(cycleItems);
    cyclesOffsets.push(cycleOffsets);
  }
  // moving all items.
  for (let i = 0; i < cycles.length; i++) {
    let cycle = cycles[i];
    for (let j = 0; j < cycle.length; j++) {
      // Following the cycles guarantees that at most one element is out of place 
      // in the cycle, thus offset is 0 or 1 depending on where the element is.
      let offset: number = cyclesOffsets[i][j] ? 0 : 1;
      parentElement.insertBefore(cyclesItems[i][j], parentElement.childNodes[cycle[j] + offset]);
    }
  }
}

/**
 * Used for testing.
 */
export function randomPermutation<T>(arr: T[]) {
  for (let i = 0; i < arr.length - 1; i++) {
    let j = Math.floor(Math.random() * (arr.length - i));
    let t = arr[j];
    arr[j] = arr[i];
    arr[i] = t;
  }
}

/**
 * Assume no repeated elements in oldArr or newArr for simplicity.
 * This function is only used for testing.
 */
export function getDiff<T>(oldArr: T[], newArr: T[]): Diff {
  let diff: Diff = {additions: [], moves: [], deletions: []};
  let moveIdx: number[] = [];
  for (let i = 0; i < newArr.length; i++) {
    var oldIdx = oldArr.indexOf(newArr[i]);
    if (oldIdx == -1) {
      diff.additions.push(i);
    } else if (oldIdx != i) {
      diff.moves.push([oldIdx, i]);
      moveIdx.push(oldIdx);
    }
  }
  for (let i = 0; i < oldArr.length; i++) {
    if (newArr.indexOf(oldArr[i]) == -1) diff.deletions.push(i);
  }  
  return diff;
}