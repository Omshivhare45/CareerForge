// Client-side DSA video catalog.
// Maps a topic's family keyword to a curated list of tutorial videos so every
// DSA topic can surface MANY videos in the workspace sidebar + main player.
// Every videoId below is reused from the existing Striver-C++ / Love-Babbar
// course libraries already shipped in client/src/utils/dsaContent.js — no new
// or guessed URLs are introduced.

const extractYoutubeId = (url) => {
  if (!url) return null;
  const s = String(url);
  const m = s.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([\w-]{11})/);
  if (m) return m[1];
  return /^[\w-]{11}$/.test(s) ? s : null;
};

const resolveDsaFamily = (title) => {
  const t = (title || '').toLowerCase();
  if (t.includes('binary search tree') || /(^|\s)bst($|\s)/.test(t)) return 'bst';
  if (t.includes('binary search') || t.includes('book allocation') || t.includes('aggressive cows')) return 'binary-search';
  if (t.includes('linked list') || /\blist\b/.test(t)) return 'linked-list';
  if (t.includes('stack') || t.includes('queue')) return 'stack-queue';
  if (t.includes('binary tree') || t.includes('tree')) return 'tree';
  if (t.includes('dynamic programming') || /\bdp\b/.test(t) || t.includes('knapsack') || t.includes('lis ') || t.includes('lcs')) return 'dp';
  if (t.includes('bit manipulation') || t.includes('bitwise') || t.includes(' bit ')) return 'bits';
  if (t.includes('backtrack')) return 'backtracking';
  if (t.includes('recursion')) return 'recursion';
  if (t.includes('greedy')) return 'greedy';
  if (t.includes('priority queue') || t.includes('heap')) return 'heap';
  if (t.includes('trie')) return 'trie';
  if (t.includes('graph')) return 'graph';
  if (t.includes('matrix') || t.includes('2d array') || t.includes('1d array')) return 'arrays';
  if (t.includes('array')) return 'arrays';
  if (t.includes('string') || t.includes('char array')) return 'strings';
  if (t.includes('hash') || t.includes(' mapping') || t.includes('hashing')) return 'hashing';
  if (t.includes('sort')) return 'sorting';
  if (t.includes('object oriented') || t.includes('oops') || t.includes(' oop')) return 'oops';
  if (t.includes('pointer') || t.includes('memory')) return 'pointers';
  if (t.includes('math') || t.includes('prime') || t.includes('gcd') || t.includes('number ')) return 'math';
  if (t.includes('pattern')) return 'patterns';
  return 'basics';
};

const playlistMap = {
  striver: 'PLgUwDviBIf0oF6QL8m22w1hIDC1vJ_BHz',
  babbar: 'PLDzeHZWIZsTryvtXdMr6rPh4IDexB5NIA'
};

// Family → video list. Titles are human-readable session labels.
export const DSA_FAMILY_LIBRARY = {
  arrays: [
    { title: 'Introduction to Arrays (C++)', videoId: 'sNrLlmOIn-c', playlistId: playlistMap.babbar },
    { title: 'Solving LeetCode Array Questions Part 1', videoId: 'oVa8DfUDKTw', playlistId: playlistMap.babbar },
    { title: 'Solving LeetCode Array Questions Part 2', videoId: 'MPvr-LmaZmA', playlistId: playlistMap.babbar },
    { title: 'Solving LeetCode Array Questions Part 3', videoId: 'Z7_nMTHROZo', playlistId: playlistMap.babbar },
    { title: 'Introduction to 2D Arrays', videoId: '1CdolnvxLs0', playlistId: playlistMap.babbar },
    { title: 'Arrays (Striver A2Z Step 2)', videoId: '37E9ckMDdTk', playlistId: playlistMap.striver },
    { title: 'Medium Array Problems (Striver A2Z)', videoId: 'NWg38xWYzEg', playlistId: playlistMap.striver }
  ],
  strings: [
    { title: 'Char Arrays, Strings & LeetCode (C++)', videoId: 'Wdjr6uoZ0e0', playlistId: playlistMap.babbar },
    { title: 'Recursion with Strings Day 4', videoId: 'WyY2Af3k1xI', playlistId: playlistMap.babbar },
    { title: 'Subsets / Subsequences of a String', videoId: 'V0IgCltYgg4', playlistId: playlistMap.babbar },
    { title: 'Phone Keypad Problem', videoId: 'tWnHbSHwNmA', playlistId: playlistMap.babbar },
    { title: 'Permutations of a String', videoId: 'va3NEycUxsg', playlistId: playlistMap.babbar },
    { title: 'Arrays (Striver A2Z Step 2)', videoId: '37E9ckMDdTk', playlistId: playlistMap.striver }
  ],
  'linked-list': [
    { title: 'Linked List & Its Types', videoId: 'q8gdBn9RPeI', playlistId: playlistMap.babbar },
    { title: 'Reverse a Linked List & Find Middle', videoId: 'vqS1nVQdCJM', playlistId: playlistMap.babbar },
    { title: 'Reverse Linked List in K Groups', videoId: 'fi2vh0nQLi0', playlistId: playlistMap.babbar },
    { title: 'Detect & Remove Loop', videoId: 'VxOFflTXlXo', playlistId: playlistMap.babbar },
    { title: 'Remove Duplicates', videoId: '7pgs-wT5d4c', playlistId: playlistMap.babbar },
    { title: 'Merge 2 Sorted Lists & Sort 0s 1s 2s', videoId: 'ogmBt6f9hw8', playlistId: playlistMap.babbar },
    { title: 'Check Palindrome Linked List', videoId: 'aD7mBVnKFEU', playlistId: playlistMap.babbar },
    { title: 'Add 2 Numbers Represented by Linked List', videoId: 'HiRlTPf9aCg', playlistId: playlistMap.babbar },
    { title: 'Clone a List with Random Pointers', videoId: '83mPr0i56Gg', playlistId: playlistMap.babbar },
    { title: 'Merge Sort on Linked List', videoId: 'rM5EEA_rbNY', playlistId: playlistMap.babbar },
    { title: 'Linked List (Striver A2Z)', videoId: 'LyuuqCVkP5I', playlistId: playlistMap.striver }
  ],
  'stack-queue': [
    { title: 'Introduction to Stacks', videoId: '_6COl6V6mng', playlistId: playlistMap.babbar },
    { title: 'Stack Interview Questions', videoId: 'BmZnJehDzyU', playlistId: playlistMap.babbar },
    { title: 'Largest Rectangular Area in Histogram', videoId: 'lJLcqDsmYfg', playlistId: playlistMap.babbar },
    { title: 'Celebrity Problem & Max Rectangle', videoId: '9u2BJfmWNEg', playlistId: playlistMap.babbar },
    { title: 'N Stacks in an Array', videoId: 'lrSXKLmnMV8', playlistId: playlistMap.babbar },
    { title: 'Design a Special Stack', videoId: 'OpwYmEBcPh0', playlistId: playlistMap.babbar },
    { title: 'Queues in C++', videoId: 'W7uB9-TKfTg', playlistId: playlistMap.babbar },
    { title: 'Queue FAANG Interview Questions', videoId: '_gJ3to4RyeQ', playlistId: playlistMap.babbar },
    { title: 'Stack & Queue (Striver A2Z)', videoId: '0X-fV-1ir9c', playlistId: playlistMap.striver }
  ],
  tree: [
    { title: 'Binary Trees & All Traversals', videoId: '5NiXlPrLslg', playlistId: playlistMap.babbar },
    { title: 'Binary Tree FAANG Questions Part 1', videoId: 'nHMQ33LZ6oA', playlistId: playlistMap.babbar },
    { title: 'Binary Tree FAANG Questions Part 2', videoId: 's1d8UGDCCN8', playlistId: playlistMap.babbar },
    { title: 'Binary Tree FAANG Questions Part 3', videoId: 'QG0hE0R_ng4', playlistId: playlistMap.babbar },
    { title: 'Construct Binary Tree from Traversal', videoId: 'ffE1xj51EBQ', playlistId: playlistMap.babbar },
    { title: 'Minimum Time to Burn a Binary Tree', videoId: 'XLdpy0_6MR4', playlistId: playlistMap.babbar },
    { title: 'Morris Traversal & Flatten to Linked List', videoId: '2BdY9fixMrM', playlistId: playlistMap.babbar },
    { title: 'Tree Traversals (Striver A2Z)', videoId: 'eKJrXBCRuNQ', playlistId: playlistMap.striver }
  ],
  bst: [
    { title: 'Binary Search Tree & Implementation', videoId: 'UeRUKRJvPa4', playlistId: playlistMap.babbar },
    { title: 'BST FAANG Questions Part 1', videoId: 'pDURIj98e0I', playlistId: playlistMap.babbar },
    { title: 'BST FAANG Questions Part 2', videoId: 'IGHyX15fLI8', playlistId: playlistMap.babbar },
    { title: 'Merge 2 BSTs', videoId: '18w8VduomfI', playlistId: playlistMap.babbar },
    { title: 'Largest BST in a Binary Tree', videoId: 'fqx8z3VepMA', playlistId: playlistMap.babbar },
    { title: 'BST Intro (Striver A2Z)', videoId: 'RuF7dPfj27Q', playlistId: playlistMap.striver }
  ],
  heap: [
    { title: 'Heaps, Heap Sort & Priority Queue', videoId: 'NKJnHewiGdc', playlistId: playlistMap.babbar },
    { title: 'Heaps Interview Questions Part 1', videoId: '_9F2VgZcvdw', playlistId: playlistMap.babbar },
    { title: 'Heaps Interview Questions Part 2', videoId: 'eccAKrmffh8', playlistId: playlistMap.babbar },
    { title: 'Heaps Hard Interview Questions Part 3', videoId: 'RrxpTWqj97A', playlistId: playlistMap.babbar },
    { title: 'Heaps Intro (General)', videoId: 'HqPJF2L5h9U', playlistId: playlistMap.striver }
  ],
  graph: [
    { title: 'Introduction to Graphs', videoId: 'EaK6aslcC5g', playlistId: playlistMap.babbar },
    { title: 'BFS Traversal in Graph', videoId: 'b5kij1Akf9I', playlistId: playlistMap.babbar },
    { title: 'DFS Traversal in Graph', videoId: 'aJa3U-hydXc', playlistId: playlistMap.babbar },
    { title: 'Cycle Detection in Undirected Graph', videoId: '1cSzxlhxOw8', playlistId: playlistMap.babbar },
    { title: 'Cycle Detection in Directed Graph', videoId: 'Tl5qbEmEQyY', playlistId: playlistMap.babbar },
    { title: 'Topological Sort (DFS)', videoId: 'T_boOrr0rvk', playlistId: playlistMap.babbar },
    { title: 'Topological Sort (Kahns Algorithm)', videoId: '6XmzL04mlgQ', playlistId: playlistMap.babbar },
    { title: 'Shortest Path in Undirected Graphs', videoId: 'abIEXKFpLNE', playlistId: playlistMap.babbar },
    { title: "Dijkstra's Algorithm", videoId: 'dVUR3Rm6biE', playlistId: playlistMap.babbar },
    { title: "Prim's Algorithm (MST)", videoId: 'rnYBi9N_vw4', playlistId: playlistMap.babbar },
    { title: "Kruskal's Algorithm & Union Find", videoId: 'KxLtIrCyXwE', playlistId: playlistMap.babbar },
    { title: 'Bridges in a Graph', videoId: 'CiDPT1xMKI0', playlistId: playlistMap.babbar },
    { title: 'Articulation Points', videoId: 'fqkqx6OBRDE', playlistId: playlistMap.babbar },
    { title: "Kosaraju's Algorithm for SCC", videoId: 'ndfjV_yHpgQ', playlistId: playlistMap.babbar },
    { title: 'Bellman Ford Algorithm', videoId: 'ijpVpsmpJtQ', playlistId: playlistMap.babbar },
    { title: 'Graph Intro (Striver A2Z)', videoId: 'RpgyCJBbl5E', playlistId: playlistMap.striver }
  ],
  dp: [
    { title: 'Intro to DP | Memoization | Tabulation', videoId: 'PGsgv6nXhLw', playlistId: playlistMap.babbar },
    { title: 'Min Cost Climbing Stairs', videoId: 'S31W3kohFDk', playlistId: playlistMap.babbar },
    { title: 'Minimum Number of Coins', videoId: 'A3FHNCAkhxE', playlistId: playlistMap.babbar },
    { title: 'Max Sum of Non-Adjacent Elements', videoId: 'm9-H6AUBLgY', playlistId: playlistMap.babbar },
    { title: 'House Robbery Problem', videoId: 'Fe2GeXEzWM0', playlistId: playlistMap.babbar },
    { title: 'Cut Rod into Segments', videoId: 'MFAAZW2znv8', playlistId: playlistMap.babbar },
    { title: '0/1 Knapsack Problem', videoId: 'xdPv2SZJLVI', playlistId: playlistMap.babbar },
    { title: 'Combination Sum IV', videoId: 'Wct0mN2SCRQ', playlistId: playlistMap.babbar },
    { title: 'LIS + Russian Doll', videoId: 'MYHajVcnXSA', playlistId: playlistMap.babbar },
    { title: 'Partition Equal Subset Sum', videoId: 'UGY7FMHt-M8', playlistId: playlistMap.babbar },
    { title: 'Longest Common Subsequence', videoId: 'y1b8pObvndA', playlistId: playlistMap.babbar },
    { title: 'Edit Distance', videoId: '8HEjwf28LyE', playlistId: playlistMap.babbar },
    { title: 'Buy and Sell Stock Part 1', videoId: 'BSRTUtvJSIk', playlistId: playlistMap.babbar },
    { title: 'DP Intro (Striver A2Z)', videoId: 'tyB0ztf0DNY', playlistId: playlistMap.striver }
  ],
  greedy: [
    { title: 'Greedy Algorithms in 1 Video', videoId: 'HZOUwKCKF5o', playlistId: playlistMap.babbar },
    { title: 'N Meetings in One Room', videoId: 'zPtI8q9ALU8' },
    { title: 'Greedy Intro (Striver A2Z)', videoId: 'SmTow5Ht4iU', playlistId: playlistMap.striver }
  ],
  recursion: [
    { title: 'Learning Recursion Day 1', videoId: '_-2u4EPHD88', playlistId: playlistMap.babbar },
    { title: 'Understanding Recursion Day 2', videoId: 'zg8Y1oE4qYQ', playlistId: playlistMap.babbar },
    { title: 'Recursion and Binary Search Day 3', videoId: 'UntSI7G5h20', playlistId: playlistMap.babbar },
    { title: 'Recursion with Strings Day 4', videoId: 'WyY2Af3k1xI', playlistId: playlistMap.babbar },
    { title: 'Merge Sort using Recursion Day 5', videoId: 'cdHEpbBVjRM', playlistId: playlistMap.babbar },
    { title: 'Quick Sort using Recursion Day 6', videoId: 'sNaHN4tZmRk', playlistId: playlistMap.babbar },
    { title: 'Subsets / Subsequences of String', videoId: 'V0IgCltYgg4', playlistId: playlistMap.babbar },
    { title: 'Phone Keypad Problem', videoId: 'tWnHbSHwNmA', playlistId: playlistMap.babbar },
    { title: 'Permutations of a String', videoId: 'va3NEycUxsg', playlistId: playlistMap.babbar },
    { title: 'Recursion (Striver A2Z L1)', videoId: 'yVdKa8dnKiE', playlistId: playlistMap.striver }
  ],
  backtracking: [
    { title: 'Rat in a Maze Problem', videoId: 'GqtyVD-x_jY', playlistId: playlistMap.babbar },
    { title: 'Rat in Maze | Backtracking Day 1', videoId: 'wjqSZy4pMT4', playlistId: playlistMap.babbar },
    { title: 'N-Queen Problem | Backtracking Day 2', videoId: '9wEwqNdOAVQ', playlistId: playlistMap.babbar },
    { title: 'Sudoku Solver | Backtracking Day 3', videoId: '8lWxaRviJBA', playlistId: playlistMap.babbar },
    { title: 'N-Queens Recursion (Striver)', videoId: 'Fg5x5y5D5yE', playlistId: playlistMap.striver }
  ],
  'binary-search': [
    { title: 'Binary Search Explained + Implementation', videoId: 'YJeoQBevNVo', playlistId: playlistMap.babbar },
    { title: 'Binary Search Interview Questions Set 1', videoId: 'zD2Jg3alZV8', playlistId: playlistMap.babbar },
    { title: 'Binary Search Interview Questions Set 2', videoId: '6z2HK4o8qcU', playlistId: playlistMap.babbar },
    { title: 'Book Allocation || Aggressive Cows', videoId: 'YTTdLgyqOLY', playlistId: playlistMap.babbar },
    { title: 'Arrays (Striver A2Z Step 2)', videoId: '37E9ckMDdTk', playlistId: playlistMap.striver }
  ],
  sorting: [
    { title: 'Selection Sort', videoId: 'UdO2NeHB46c', playlistId: playlistMap.babbar },
    { title: 'Bubble Sort', videoId: 'zOhUavxlzw4', playlistId: playlistMap.babbar },
    { title: 'Insertion Sort', videoId: '7kIVfVY6Axk', playlistId: playlistMap.babbar },
    { title: 'Merge Sort using Recursion', videoId: 'cdHEpbBVjRM', playlistId: playlistMap.babbar },
    { title: 'Quick Sort using Recursion', videoId: 'sNaHN4tZmRk', playlistId: playlistMap.babbar }
  ],
  hashing: [
    { title: 'Hashmaps in C++', videoId: '7mUKGHznpfg', playlistId: playlistMap.babbar },
    { title: 'Hashmaps in Java', videoId: 'KEs5UyBJ39g', playlistId: playlistMap.babbar },
    { title: 'Hashing (Striver A2Z L1)', videoId: 'm8QD7aC4Fk0', playlistId: playlistMap.striver }
  ],
  trie: [
    { title: 'Trie & Its Implementation', videoId: 'Y6dOuGjwsxU', playlistId: playlistMap.babbar },
    { title: 'Longest Common Prefix (Trie)', videoId: 'VTr3Nh7BadI', playlistId: playlistMap.babbar },
    { title: 'Phone Directory Using Trie', videoId: 'SK2S5lQegVg', playlistId: playlistMap.babbar },
    { title: 'Trie Intro (Striver A2Z)', videoId: 'dBGUmUQhjaM', playlistId: playlistMap.striver }
  ],
  bits: [
    { title: 'Bitwise Operators, For Loops', videoId: 'yjdQHb2elqI', playlistId: playlistMap.babbar },
    { title: 'Bit Manipulation Intro (Striver A2Z)', videoId: '5754S_j31A8', playlistId: playlistMap.striver }
  ],
  math: [
    { title: 'Basic Maths for DSA (C++)', videoId: 'KdePjukNs98', playlistId: playlistMap.babbar },
    { title: 'Basic Maths (Java)', videoId: '13W_wGClMlo' },
    { title: 'Basic Maths for DSA (Striver)', videoId: 'm8QD7aC4Fk0', playlistId: playlistMap.striver }
  ],
  oops: [
    { title: 'OOPs Concepts Part 1', videoId: 'i_5pvt7ag7E', playlistId: playlistMap.babbar },
    { title: '4 Pillars of OOPs Part 2', videoId: 'b3GccK5_KSQ', playlistId: playlistMap.babbar }
  ],
  pointers: [
    { title: 'Pointers Part 1', videoId: 'YHwEIfrXZgE', playlistId: playlistMap.babbar },
    { title: 'Pointers Part 2', videoId: 'rlpw7oi-bpE', playlistId: playlistMap.babbar },
    { title: 'Double Pointers & MCQs', videoId: 'P0UsAxtXq2Y', playlistId: playlistMap.babbar },
    { title: 'Reference Variable | Static vs Dynamic', videoId: 'MMO2c57XHzM', playlistId: playlistMap.babbar },
    { title: 'Dynamic Memory Allocation of 2D Arrays', videoId: 'LlqgWQgm58g', playlistId: playlistMap.babbar }
  ],
  patterns: [
    { title: 'If-Else, Loops & Pattern Questions Part 1', videoId: 'WR31ByTzAVQ', playlistId: playlistMap.babbar },
    { title: 'Solving Pattern Questions Part 2', videoId: 'dr-pLeJBr38', playlistId: playlistMap.babbar },
    { title: 'Patterns (Striver A2Z)', videoId: 'tNm_NNSB3_w', playlistId: playlistMap.striver },
    { title: 'Switch Statement & Functions', videoId: '8nNqk2NPbRA', playlistId: playlistMap.babbar }
  ],
  basics: [
    { title: 'Intro to Programming & Flowcharts', videoId: 'WQoB2z67hvY', playlistId: playlistMap.babbar },
    { title: 'Write Your First Program in C++', videoId: 't6zLJOCVqD0', playlistId: playlistMap.babbar },
    { title: 'If-Else, Loops & Pattern Questions Part 1', videoId: 'WR31ByTzAVQ', playlistId: playlistMap.babbar },
    { title: 'Solving Pattern Questions Part 2', videoId: 'dr-pLeJBr38', playlistId: playlistMap.babbar },
    { title: 'Bitwise Operators, For Loops', videoId: 'yjdQHb2elqI', playlistId: playlistMap.babbar },
    { title: 'C++ STL in 1 Video', videoId: 'WgMPrLX-zsA', playlistId: playlistMap.babbar },
    { title: 'Macros, Global Variables, Inline Functions', videoId: '0TEvaAiqo8Y', playlistId: playlistMap.babbar },
    { title: 'Basic Maths for DSA', videoId: 'KdePjukNs98', playlistId: playlistMap.babbar },
    { title: 'Introduction to A2Z DSA (Striver)', videoId: 'yVdKa8dnKiE', playlistId: playlistMap.striver },
    { title: 'C++ Basics (Striver A2Z)', videoId: 'EAR7De6Goz4', playlistId: playlistMap.striver }
  ]
};

// Build the full video list for a topic object:
// primary DB video (if the topic carries its own youtubeLink) + family lib + checkpoints.
export const getDsaVideoList = (topic) => {
  if (!topic) return [];
  const list = [];

  const dbId = extractYoutubeId(topic.youtubeLink);
  if (dbId) {
    list.push({ key: 'db', title: topic.title, videoId: dbId, type: 'tutorial', primary: true });
  }

  const lib = DSA_FAMILY_LIBRARY[resolveDsaFamily(topic.title)] || DSA_FAMILY_LIBRARY.basics;
  lib.forEach((v) => {
    if (!list.some((x) => x.videoId === v.videoId)) {
      list.push({ key: `lib:${v.videoId}`, title: v.title, videoId: v.videoId, playlistId: v.playlistId, type: 'tutorial' });
    }
  });

  // Checkpoint modules are folded in as normal topics; every checkpoint = a video.
  // Any topic that carries checkpoints (e.g. DSA Cheat Sheet sheet-jumps) gets them too.
  const hasCheckpoints = Array.isArray(topic.checkpoints) && topic.checkpoints.length > 0;
  if (hasCheckpoints) {
    topic.checkpoints.forEach((cp, i) => {
      list.push({ key: `cp:${cp.id}`, title: cp.label || `Checkpoint ${i + 1}`, type: 'checkpoint', checkpointId: cp.id });
    });
  }

  return list;
};

export const getDsaVideoCount = (topic) => getDsaVideoList(topic).length;