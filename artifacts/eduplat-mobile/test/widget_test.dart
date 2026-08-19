import 'package:flutter_test/flutter_test.dart';
import 'package:eduplat_mobile/main.dart';

void main() {
  testWidgets('EduplatApp smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const EduplatApp());
  });
}
