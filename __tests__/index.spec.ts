// Tests

const addition = (num1: number, num2: number): number => num1 + num2

describe('It able to run test', () => {
    it('returns the sum of 2 and 4 to be 6', () => {
        expect(addition(2, 4)).toBe(6)
    })
})
