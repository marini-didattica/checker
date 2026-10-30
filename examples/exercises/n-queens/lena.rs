/// N-Queens — count all solutions with backtracking.
pub fn count_solutions(n: usize) -> usize {
    let mut columns = vec![false; n];
    let mut diagonals = vec![false; n * 2];
    let mut anti_diagonals = vec![false; n * 2];

    fn place(
        row: usize,
        n: usize,
        columns: &mut [bool],
        diagonals: &mut [bool],
        anti_diagonals: &mut [bool],
    ) -> usize {
        if row == n {
            return 1;
        }

        let mut total = 0;

        for column in 0..n {
            let diagonal = row + column;
            let anti_diagonal = row + n - column - 1;

            if columns[column] || diagonals[diagonal] || anti_diagonals[anti_diagonal] {
                continue;
            }

            columns[column] = true;
            diagonals[diagonal] = true;
            anti_diagonals[anti_diagonal] = true;

            total += place(row + 1, n, columns, diagonals, anti_diagonals);

            columns[column] = false;
            diagonals[diagonal] = false;
            anti_diagonals[anti_diagonal] = false;
        }

        total
    }

    place(0, n, &mut columns, &mut diagonals, &mut anti_diagonals)
}
