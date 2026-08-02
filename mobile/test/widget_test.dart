import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/main.dart';

void main() {
  testWidgets('App arranca y muestra login o loader', (tester) async {
    await tester.pumpWidget(const GymBroMemberApp());
    await tester.pump();
    expect(find.byType(GymBroMemberApp), findsOneWidget);
  });
}
