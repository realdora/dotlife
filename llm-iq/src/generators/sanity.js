import { shuffle } from '../rng.js';
import { cleanWord } from '../answer.js';

// The sentinel tier: classic trick questions every casual user reaches
// for when they suspect a model got dumber. Deliberately static — their
// role is exactly "the questions everyone tests", and a healthy model
// must never miss them. Multiple-choice keeps grading mechanical; the
// trap option is always present. L0 only, weight 1.

const POOL = [
  {
    q: 'Your car is parked 50 meters from your home and you want to wash it. What is the most sensible way to get to your car?',
    a: 'Walk over to it',
    traps: ['Drive over to it', 'Call a taxi', 'Take the bus one stop'],
  },
  {
    q: 'Which weighs more: one kilogram of steel or one kilogram of feathers?',
    a: 'They weigh the same',
    traps: ['The steel', 'The feathers', 'It depends on the altitude'],
  },
  {
    q: 'Five shirts laid out in the sun take four hours to dry. How long do twenty shirts laid out the same way take?',
    a: 'Four hours',
    traps: ['Sixteen hours', 'Eight hours', 'Twenty hours'],
  },
  {
    q: 'How many months of the year have at least 28 days?',
    a: 'Twelve',
    traps: ['One', 'Two', 'Eleven'],
  },
  {
    q: 'A bat and a ball cost $1.10 together. The bat costs $1.00 more than the ball. How much is the ball?',
    a: '5 cents',
    traps: ['10 cents', '1 dollar', '15 cents'],
  },
  {
    q: 'If 5 machines take 5 minutes to make 5 widgets, how long do 100 machines take to make 100 widgets?',
    a: '5 minutes',
    traps: ['100 minutes', '20 minutes', '1 minute'],
  },
  {
    q: 'A rooster sits on the peak of a barn roof and lays an egg. Which side does the egg roll down?',
    a: 'Roosters do not lay eggs',
    traps: ['The north side', 'The steeper side', 'The side facing the wind'],
  },
  {
    q: 'Which number is larger: 9.11 or 9.9?',
    a: '9.9',
    traps: ['9.11', 'They are equal', 'It cannot be determined'],
  },
  {
    q: 'You are running a race and you overtake the runner in second place. What place are you in now?',
    a: 'Second',
    traps: ['First', 'Third', 'It depends on the distance left'],
  },
  {
    q: 'A farmer has 17 sheep. All but 9 run away. How many sheep does the farmer have left?',
    a: '9',
    traps: ['8', '17', '26'],
  },
];

const LETTERS = ['A', 'B', 'C', 'D'];

export function sanity(rng, id, _level = 0, k = 0) {
  const order = shuffle(rng, POOL);
  const item = order[k % POOL.length];
  const options = shuffle(rng, [item.a, ...item.traps]);
  const correct = LETTERS[options.indexOf(item.a)];

  return {
    id,
    category: 'sanity',
    prompt:
      `${item.q}\n\n` +
      options.map((o, i) => `${LETTERS[i]}) ${o}`).join('\n') +
      `\n\nAnswer with just the letter.`,
    answer: correct,
    check: (v) => cleanWord(v).toUpperCase().replace(/\)$/, '') === correct,
  };
}
