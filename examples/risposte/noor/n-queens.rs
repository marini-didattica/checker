// N-Queens — bitmask backtracking.
pub fn count_solutions(n: u32) -> u32 {
    fn solve(row: u32, n: u32, columns: u32, diagonals: u32, anti_diagonals: u32) -> u32 {
        if row == n {
            return 1;
        }

        let mut total = 0;
        let mut available = !(columns | diagonals | anti_diagonals) & ((1u32 << n) - 1);

        while available != 0 {
            let bit = available & available.wrapping_neg();
            available ^= bit;

            total += solve(
                row + 1,
                n,
                columns | bit,
                (diagonals | bit) << 1,
                (anti_diagonals | bit) >> 1,
            );
        }

        total
    }

    solve(0, n, 0, 0, 0)
}
