// Serialize BigInt for Jest
if (typeof BigInt !== 'undefined') {
  BigInt.prototype.toJSON = function() {
    return this.toString() + 'n';
  };
}
