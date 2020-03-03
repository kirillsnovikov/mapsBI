export default class DataHandler {
  constructor(data, points, first, second, third) {
    this.$data = data;
    this.$first = first || null;
    this.$second = second || null;
    this.$third = third || null;
    this.$points = points || [];
  }

  get data() {
    return this.$data;
  }
}
