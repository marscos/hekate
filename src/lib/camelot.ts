export type Key = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11
export type Mode = 1 | 0

type CamelotNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
type CamelotLetter = 'A' | 'B'

export type Camelot = {
	number: CamelotNumber
	letter: CamelotLetter
}
export type CamelotString = `${CamelotNumber}${CamelotLetter}`

export function pitchClassToCamelot(key: Key, mode: Mode): Camelot {
	const dictionary: { [k in Key]: { [m in Mode]: Camelot } } = {
		0: {
			1: { number: 8, letter: 'B' },
			0: { number: 5, letter: 'A' }
		},
		1: {
			1: { number: 3, letter: 'B' },
			0: { number: 12, letter: 'A' }
		},
		2: {
			1: { number: 10, letter: 'B' },
			0: { number: 7, letter: 'A' }
		},
		3: {
			1: { number: 5, letter: 'B' },
			0: { number: 2, letter: 'A' }
		},
		4: {
			1: { number: 12, letter: 'B' },
			0: { number: 9, letter: 'A' }
		},
		5: {
			1: { number: 7, letter: 'B' },
			0: { number: 4, letter: 'A' }
		},
		6: {
			1: { number: 2, letter: 'B' },
			0: { number: 11, letter: 'A' }
		},
		7: {
			1: { number: 9, letter: 'B' },
			0: { number: 6, letter: 'A' }
		},
		8: {
			1: { number: 4, letter: 'B' },
			0: { number: 1, letter: 'A' }
		},
		9: {
			1: { number: 11, letter: 'B' },
			0: { number: 8, letter: 'A' }
		},
		10: {
			1: { number: 6, letter: 'B' },
			0: { number: 3, letter: 'A' }
		},
		11: {
			1: { number: 1, letter: 'B' },
			0: { number: 10, letter: 'A' }
		}
	}
	return dictionary[key][mode]
}

export function camelotStringToObject(camelotString: CamelotString): Camelot {
	const number = parseInt(camelotString.slice(0, -1)) as CamelotNumber
	const letter = camelotString.slice(-1) as CamelotLetter

	return { number, letter }
}

export function isWheelNeighbour(key1: Camelot, key2: Camelot): boolean {
	const sameNumber = key1.number === key2.number
	const oneNumberUpOrDown = Math.abs(key1.number - key2.number) === 1 && key1.letter === key2.letter

	return sameNumber || oneNumberUpOrDown
}

export function camelotColor(camelot: Camelot): string {
	const dictionary: { [n in CamelotNumber]: { [l in CamelotLetter]: string } } = {
		1: {
			A: '#7af0d4',
			B: '#16efc1'
		},
		2: {
			A: '#93f3a1',
			B: '#36f180'
		},
		3: {
			A: '#b2f485',
			B: '#84f448'
		},
		4: {
			A: '#e4e5a7',
			B: '#e2ca72'
		},
		5: {
			A: '#fdc7ac',
			B: '#fea07d'
		},
		6: {
			A: '#feb1bd',
			B: '#fb8996'
		},
		7: {
			A: '#ffb1d0',
			B: '#ff7eb5'
		},
		8: {
			A: '#f0b2f0',
			B: '#f180db'
		},
		9: {
			A: '#e5b5fc',
			B: '#d08eff'
		},
		10: {
			A: '#cad1fe',
			B: '#a1b8ff'
		},
		11: {
			A: '#a5e6fd',
			B: '#54dbf6'
		},
		12: {
			A: '#5df1e6',
			B: '#1beaeb'
		}
	}
	return dictionary[camelot.number][camelot.letter]
}
