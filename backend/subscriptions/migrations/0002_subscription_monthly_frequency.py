from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("subscriptions", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="subscription",
            name="delivery_frequency",
            field=models.CharField(
                choices=[
                    ("daily", "Daily"),
                    ("alternate_days", "Alternate Days"),
                    ("weekly", "Weekly"),
                    ("monthly", "Monthly"),
                ],
                default="daily",
                max_length=20,
            ),
        ),
    ]
