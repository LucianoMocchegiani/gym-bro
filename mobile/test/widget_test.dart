import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/main.dart';

void main() {
  testWidgets('scaffold shows GymBro Mobile', (WidgetTester tester) async {
    await tester.pumpWidget(const GymBroApp());
    expect(find.textContaining('GymBro Mobile'), findsOneWidget);
  });
}
