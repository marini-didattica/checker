package main

// ValidParentheses determines whether every opening bracket is closed
// by the matching kind of bracket, in the right order.
func ValidParentheses(text string) bool {
	closing := map[rune]rune{')': '(', ']': '[', '}': '{'}
	open := make([]rune, 0, len(text))

	for _, symbol := range text {
		if symbol == '(' || symbol == '[' || symbol == '{' {
			open = append(open, symbol)
			continue
		}

		if len(open) == 0 {
			return false
		}

		if open[len(open)-1] != closing[symbol] {
			return false
		}

		open = open[:len(open)-1]
	}

	return len(open) == 0
}
