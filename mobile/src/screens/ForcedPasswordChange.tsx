import { useState } from 'react';
import { View } from 'react-native';
import { signInWithPassword } from '../api/auth';
import { changeMobilePassword } from '../api/profile';
import type { MobileSession } from '../auth/session';
import { Body, Card, Field, Notice, PrimaryButton, Title } from '../ui';

export function ForcedPasswordChange({
  email,
  onCompleted,
}: {
  email: string;
  onCompleted: (session: MobileSession) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    setMessage(null);
    try {
      await changeMobilePassword(currentPassword, newPassword);
      onCompleted(await signInWithPassword(email, newPassword));
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Unable to change password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View>
      <Title>Choose a new password</Title>
      <Body>A Super User set a temporary password. Replace it before you continue.</Body>
      <Card>
        <Field label="Temporary password" onChangeText={setCurrentPassword} secureTextEntry value={currentPassword} />
        <Field label="New password" onChangeText={setNewPassword} secureTextEntry value={newPassword} />
        <Notice>{message}</Notice>
        <PrimaryButton disabled={!currentPassword || !newPassword} label="Save password" loading={submitting} onPress={() => { void handleSubmit(); }} />
      </Card>
    </View>
  );
}
