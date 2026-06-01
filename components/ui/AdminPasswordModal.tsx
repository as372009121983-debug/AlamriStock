// Powered by OnSpace.AI
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Modal } from './Modal';
import { Button } from './Button';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';

type Props = {
  visible: boolean;
  title?: string;
  description?: string;
  expectedPassword: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function AdminPasswordModal({
  visible,
  title = 'تأكيد المدير',
  description = 'أدخل كلمة مرور المدير لإتمام العملية',
  expectedPassword,
  onClose,
  onSuccess,
}: Props) {
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setPwd('');
      setError('');
      setShow(false);
    }
  }, [visible]);

  function submit() {
    const expected = (expectedPassword || '0').trim();
    if (pwd.trim() === expected) {
      onSuccess();
      onClose();
    } else {
      setError('كلمة المرور غير صحيحة');
    }
  }

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button title="إلغاء" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
          <Button title="تأكيد" icon="check" onPress={submit} style={{ flex: 1 }} />
        </>
      }
    >
      <View style={styles.iconWrap}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="shield-key-outline" size={32} color={Colors.primary} />
        </View>
        <Text style={styles.description}>{description}</Text>
      </View>
      <View style={styles.inputWrap}>
        <Pressable onPress={() => setShow((s) => !s)} hitSlop={8} style={styles.eyeBtn}>
          <MaterialCommunityIcons
            name={show ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={Colors.textMuted}
          />
        </Pressable>
        <TextInput
          value={pwd}
          onChangeText={(t) => {
            setPwd(t);
            if (error) setError('');
          }}
          placeholder="كلمة مرور المدير"
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={!show}
          style={styles.input}
          autoFocus
          onSubmitEditing={submit}
        />
        <MaterialCommunityIcons name="lock-outline" size={20} color={Colors.primary} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.hint}>* يمكن تغيير كلمة المرور من الإعدادات</Text>
    </Modal>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
  inputWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    minHeight: 52,
  },
  input: {
    flex: 1,
    fontSize: FontSize.lg,
    color: Colors.text,
    textAlign: 'right',
    writingDirection: 'rtl',
    fontWeight: FontWeight.semibold,
    letterSpacing: 2,
  },
  eyeBtn: { padding: 4 },
  error: { color: Colors.danger, fontSize: FontSize.sm, textAlign: 'right', marginTop: 4 },
  hint: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'right' },
});
