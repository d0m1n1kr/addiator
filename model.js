/*
 * AddiatorModel – Rechenwerk eines Addiator Duplex.
 *
 * digits[0] ist die höchstwertige Stelle (links), digits[n-1] die Einer (rechts).
 * Ein Übertrag (carry) bzw. eine Entlehnung (borrow) wandert nach links zur
 * nächst­höheren Stelle – wie der mechanische Hebel im echten Gerät.
 */
(function (global) {
  'use strict';

  class AddiatorModel {
    constructor(numDigits = 9) {
      this.numDigits = numDigits;
      this.digits = new Array(numDigits).fill(0);
      this._listeners = new Set();
    }

    on(fn) {
      this._listeners.add(fn);
      return () => this._listeners.delete(fn);
    }

    _emit(evt) {
      this._listeners.forEach((fn) => fn(evt));
    }

    get value() {
      return this.digits.reduce((acc, d) => acc * 10 + d, 0);
    }

    clear() {
      this.digits.fill(0);
      this._emit({ type: 'clear', digits: [...this.digits] });
    }

    /**
     * Addiere `amount` (1..9) auf Stelle `i`. Überträge kaskadieren nach links.
     * Liefert die Liste der Überträge {from, to} für die Animation.
     */
    add(i, amount) {
      const carries = [];
      let idx = i;
      let carry = amount;
      let overflow = false;
      while (carry !== 0) {
        if (idx < 0) {
          overflow = true; // läuft links aus dem Register heraus
          break;
        }
        const sum = this.digits[idx] + carry;
        this.digits[idx] = sum % 10;
        carry = Math.floor(sum / 10);
        if (carry > 0) carries.push({ from: idx, to: idx - 1 });
        idx--;
      }
      this._emit({ type: 'add', column: i, amount, carries, overflow, digits: [...this.digits] });
      return { carries, overflow };
    }

    /**
     * Subtrahiere `amount` (1..9) von Stelle `i`. Entlehnungen kaskadieren nach links.
     */
    sub(i, amount) {
      const borrows = [];
      let idx = i;
      let borrow = amount;
      let underflow = false;
      while (borrow !== 0) {
        if (idx < 0) {
          underflow = true;
          break;
        }
        let d = this.digits[idx] - borrow;
        let nextBorrow = 0;
        while (d < 0) {
          d += 10;
          nextBorrow++;
        }
        this.digits[idx] = d;
        if (nextBorrow > 0) borrows.push({ from: idx, to: idx - 1 });
        borrow = nextBorrow;
        idx--;
      }
      this._emit({ type: 'sub', column: i, amount, borrows, underflow, digits: [...this.digits] });
      return { borrows, underflow };
    }
  }

  global.AddiatorModel = AddiatorModel;
})(window);
