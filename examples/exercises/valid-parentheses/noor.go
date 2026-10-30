package main

// validParentheses checks bracket nesting with an explicit stack.
func validParentheses(input string) bool {
	pairs := map[rune]rune{')': '(', ']': '[', '}': '{'}
	stack := make([]rune, 0, len(input))

	for _, character := range input {
		switch character {
		case '(', '[', '{':
			stack = append(stack, character)
		default:
			if len(stack) == 0 {
				return false
			}

			last := stack[len(stack)-1]
			if last != pairs[character] {
				return false
			}

			stack = stack[:len(stack)-1]
		}
	}

	return len(stack) == 0
}
