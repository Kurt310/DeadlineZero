import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/app.dart';

void main() {
  testWidgets('DeadlineZero app launches smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const DeadlineZeroApp());
    expect(find.text('DeadlineZero'), findsWidgets);
  });
}
