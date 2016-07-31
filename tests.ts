import {applyDiff as applyDiff, getDiff, randomPermutation} from './diff';

describe('apply diff should reflect dom when changes are', () => {
  function domArray() {
    let arr = document.createElement('div');
    for (let i = 0; i < 6; i++) {
      let div = document.createElement('div');
      div.textContent = String.fromCharCode(97 + i) + ',';
      arr.appendChild(div);
    }
    return arr;
  }

  it('initial content', () => {
    expect(domArray().textContent).toEqual('a,b,c,d,e,f,');
  });

  it('only deletions', () => {
    let dom = domArray();
    applyDiff({
      additions: [],
      moves: [],
      deletions: [3, 4, 5]
    }, dom)
    expect(dom.textContent).toEqual('a,b,c,');
  });

  it('deletions and additions', () => {
    let dom = domArray();
    applyDiff({
      additions: [0, 2, 5],
      moves: [],
      deletions: [0, 2, 5]
    }, dom)
    expect(dom.textContent).toEqual('new,b,new,d,e,new,');
  });

  it('one move forward', () => {
    let dom = domArray();
    applyDiff({
      additions: [0],
      moves: [[0, 3]],
      deletions: [3]
    }, dom)
    expect(dom.textContent).toEqual('new,b,c,a,e,f,');
  });
  
  it('one move backward', () => {
    let dom = domArray();
    applyDiff({
      additions: [3],
      moves: [[3, 0]],
      deletions: [0]
    }, dom)
    expect(dom.textContent).toEqual('d,b,c,new,e,f,');
  });

  it('single adjacent swap', () => {
    let dom = domArray();
    applyDiff({
      additions: [],
      moves: [[0, 1],[1, 0]],
      deletions: []
    }, dom)
    expect(dom.textContent).toEqual('b,a,c,d,e,f,');
  });

  it('single non-adjacent swap', () => {
    let dom = domArray();
    applyDiff({
      additions: [],
      moves: [[3, 0], [0, 3]],
      deletions: []
    }, dom)
    expect(dom.textContent).toEqual('d,b,c,a,e,f,');
  });

  it('three way transposition', () => {
    let dom = domArray();
    applyDiff({
      additions: [],
      moves: [[2, 0], [0, 1], [1, 2]],
      deletions: []
    }, dom)
    expect(dom.textContent).toEqual('c,a,b,d,e,f,');
  });

  it('two swaps', () => {
    let dom = domArray();
    applyDiff({
      additions: [],
      moves: [[3, 0], [2, 1], [1, 2], [0, 3]],
      deletions: []
    }, dom)
    expect(dom.textContent).toEqual('d,c,b,a,e,f,');
  });

  it('two swaps and addition', () => {
    let dom = domArray();
    applyDiff({
      additions: [2],
      moves: [[3, 0], [2, 1], [1, 3], [0, 4], [4, 5], [5, 6]],
      deletions: []
    }, dom)
    expect(dom.textContent).toEqual('d,c,new,b,a,e,f,');
  });

  it('a move, addition and deletion', () => {
    let dom = domArray();
    applyDiff({
      additions: [2],
      moves: [[3, 0], [2, 1], [0, 3]],
      deletions: [1]
    }, dom)
    expect(dom.textContent).toEqual('d,c,new,a,e,f,');
  });

  it('moves, addition and deletion', () => {
    let dom = domArray();
    applyDiff({
      additions: [1, 3],
      moves: [[1, 2], [2, 4]],
      deletions: [3, 4, 5]
    }, dom)
    expect(dom.textContent).toEqual('a,new,b,new,c,');
  });

  it('integration with getDiff', () => {
    let dom = domArray();
    let oldArray = ['a', 'b', 'c', 'd', 'e', 'f'];
    let arrString = 'new,e,new,a,new,new,c,new,f,new';
    applyDiff(getDiff(oldArray, arrString.split(',')), dom);
    expect(dom.textContent).toEqual(arrString + ',');
  });

  it('integration with getDiff', () => {
    let dom = domArray();
    let oldArray = ['a', 'b', 'c', 'd', 'e', 'f'];
    let arrString = 'c,b,d,f,e,a';
    applyDiff(getDiff(oldArray, arrString.split(',')), dom);
    expect(dom.textContent).toEqual(arrString + ',');
  });

  it('100 random permutations', () => {
    let oldArray = ['a', 'b', 'c', 'd', 'e', 'f'];
    for (let i = 0; i < 100; i++) {
      let testArray = ['a', 'b', 'c', 'd', 'e', 'f'];
      let dom = domArray();
      randomPermutation(testArray);
      applyDiff(getDiff(oldArray, testArray), dom);
      expect(dom.textContent).toEqual(testArray.join(',') + ',');
    }
  });

  it('100 random permutations with one deletion', () => {
    let oldArray = ['a', 'b', 'c', 'd', 'e', 'f'];
    for (let i = 0; i < 100; i++) {
      let testArray = ['a', 'b', 'c', 'd', 'e', 'f'];
      randomPermutation(testArray);
      testArray.pop();

      let dom = domArray();
      applyDiff(getDiff(oldArray, testArray), dom);
      expect(dom.textContent).toEqual(testArray.join(',') + ',');
    }
  });

  it('100 random permutations with one deletion and three additions', () => {
    let oldArray = ['a', 'b', 'c', 'd', 'e', 'f'];
    for (let i = 0; i < 100; i++) {
      let testArray = ['a', 'b', 'c', 'd', 'e', 'f'];
      randomPermutation(testArray);
      testArray.splice(Math.floor(Math.random() * 6), 1);

      testArray.splice(2, 0, 'new');
      testArray.push('new');
      testArray.splice(2, 4, 'new');

      let dom = domArray();
      applyDiff(getDiff(oldArray, testArray), dom);
      expect(dom.textContent).toEqual(testArray.join(',') + ',');
    }
  });
});

describe('getDiff should obtain the diff for', () => {
  let oldArray = ['a', 'b', 'c', 'd', 'e', 'f'];
  
  it('deletions', () => {
    expect(getDiff(oldArray, ['a','b','c'])).toEqual({
      additions: [],
      moves: [],
      deletions: [3, 4, 5]
    });
  });

  it('deletions, additions and moves', () => {
    expect(getDiff(oldArray, ['a', 'new', 'b', 'new', 'c'])).toEqual({
      additions: [1, 3],
      moves: [[1, 2], [2, 4]],
      deletions: [3, 4, 5]
    });
  });
});