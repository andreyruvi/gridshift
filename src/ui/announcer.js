/**
 * Screen-reader support.
 *
 * The upstream game was unplayable without sight: tile values lived only in
 * positioned `div`s with no roles, labels or announcements. Two things fix it —
 * a polite live region that narrates the result of each move, and an off-screen
 * table that mirrors the board so the whole position can be read on demand.
 */
export class Announcer {
  constructor(liveRegion, tableHost) {
    this.liveRegion = liveRegion;
    this.tableHost = tableHost;
    this.last = '';
  }

  say(message) {
    if (!message || message === this.last) {
      // Re-announcing identical text is silently dropped by most readers;
      // a zero-width space forces the region to change.
      this.liveRegion.textContent = '';
    }
    this.last = message;
    this.liveRegion.textContent = message;
  }

  /** Narrate what a move did, in the order a player cares about. */
  describeMove(result, game) {
    if (!result.moved) return this.say('That move changes nothing.');
    const parts = [];
    if (result.merges === 1) parts.push(`Merged one pair for ${result.gained} points.`);
    else if (result.merges > 1) parts.push(`Merged ${result.merges} pairs for ${result.gained} points.`);
    else parts.push('Tiles slid.');
    parts.push(`Score ${game.score}.`);
    if (result.reachedTarget) parts.push(`You reached ${game.winTarget}.`);
    if (result.over) parts.push('No moves left. Game over.');
    return this.say(parts.join(' '));
  }

  /** Rebuild the off-screen board table. */
  describeBoard(game) {
    const table = document.createElement('table');
    const caption = document.createElement('caption');
    caption.textContent = `Board, ${game.size} by ${game.size}. Score ${game.score}.`;
    table.append(caption);

    const head = document.createElement('thead');
    const headRow = document.createElement('tr');
    headRow.append(document.createElement('td'));
    for (let x = 0; x < game.size; x += 1) {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = `Column ${x + 1}`;
      headRow.append(th);
    }
    head.append(headRow);
    table.append(head);

    const body = document.createElement('tbody');
    for (let y = 0; y < game.size; y += 1) {
      const row = document.createElement('tr');
      const rowHeader = document.createElement('th');
      rowHeader.scope = 'row';
      rowHeader.textContent = `Row ${y + 1}`;
      row.append(rowHeader);
      for (let x = 0; x < game.size; x += 1) {
        const cell = document.createElement('td');
        const tile = game.grid.cellContent({ x, y });
        cell.textContent = tile ? String(tile.value) : 'empty';
        row.append(cell);
      }
      body.append(row);
    }
    table.append(body);
    this.tableHost.replaceChildren(table);
  }
}
