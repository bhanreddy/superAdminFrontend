import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { superAdminApi, founderApi } from '../../src/services/apiService';
import { School } from '../../src/types/school';
import { Picker } from '@react-native-picker/picker';
import { pressableWebStyles } from '../../src/utils/webPressable';
import { safePressHandler } from '../../src/utils/safePressHandler';
import { INPUT_PLACEHOLDER_COLOR } from '../../src/theme/styles';

type ContentType = 'money_science' | 'life_values' | 'science_projects';

export default function ManageContent() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<ContentType>('money_science');
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  
  // Form States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentBody, setContentBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingSchools, setFetchingSchools] = useState(true);

  // Dynamic Fields
  const [ageGroup, setAgeGroup] = useState('');
  const [duration, setDuration] = useState('');
  const [points, setPoints] = useState('');
  const [difficulty, setDifficulty] = useState('beginner');
  const [videoUrl, setVideoUrl] = useState('');

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    try {
      const res = await superAdminApi.getSchools();
      const data = Array.isArray(res) ? res : (res.data || []);
      setSchools(data);
      if (data && data.length > 0) {
        setSelectedSchool(data[0].id.toString());
      }
    } catch {
      Alert.alert('Error', 'Failed to load schools listing.');
    } finally {
      setFetchingSchools(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setContentBody('');
    setAgeGroup('');
    setDuration('');
    setPoints('');
    setVideoUrl('');
  };

  const handleSubmit = async () => {
    if (!selectedSchool) {
      Alert.alert('Error', 'Please select a school to assign this content to.');
      return;
    }
    if (!title || !description) {
      Alert.alert('Error', 'Please fill required fields (Title and Description).');
      return;
    }
    
    setLoading(true);
    try {
      await founderApi.createContent({
        content_type: activeTab,
        title,
        description,
        school_id: parseInt(selectedSchool, 10),
        content_url: videoUrl || null,
        content_body: contentBody,
        age_group: ageGroup,
        estimated_duration: parseInt(duration) || 0,
        total_points: parseInt(points) || 10,
        difficulty_level: difficulty,
      });
      
      Alert.alert('Success', 'Content added successfully!');
      resetForm();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const themedStyles = useMemo(() => ({
    container: [styles.container, { backgroundColor: 'transparent' }],
    header: [styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }],
    backBtnText: [styles.backBtnText, { color: colors.primary }],
    headerTitle: [styles.headerTitle, { color: colors.textPrimary }],
    tabBar: [styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }],
    activeTab: [styles.activeTab, { borderBottomColor: colors.primary }],
    tabText: [styles.tabText, { color: colors.textSecondary }],
    activeTabText: { color: colors.primary },
    sectionTitle: [styles.sectionTitle, { color: colors.textPrimary }],
    label: [styles.label, { color: colors.textSecondary }],
    pickerContainer: [styles.pickerContainer, { borderColor: colors.border, backgroundColor: colors.surface }],
    picker: [styles.picker, { color: colors.textPrimary }],
    input: [styles.input, {
      backgroundColor: colors.surface,
      borderColor: isDark ? colors.border : '#CBD5E1',
      color: colors.textPrimary,
    }],
    submitBtn: [styles.submitBtn, { backgroundColor: colors.primary }],
  }), [colors, isDark]);

  return (
    <View style={themedStyles.container}>
      <View style={themedStyles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, ...pressableWebStyles(pressed, { pressedOpacity: 0.85 })]}
          onPress={() => router.back()}
        >
          <Text style={themedStyles.backBtnText}>←</Text>
        </Pressable>
        <Text style={themedStyles.headerTitle}>Manage Content</Text>
      </View>

      <View style={themedStyles.tabBar}>
        {(['money_science', 'life_values', 'science_projects'] as ContentType[]).map(tab => (
          <Pressable
            key={tab}
            style={({ pressed }) => [
              styles.tab,
              activeTab === tab && themedStyles.activeTab,
              ...pressableWebStyles(pressed, { pressedOpacity: 0.85 }),
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[themedStyles.tabText, activeTab === tab && themedStyles.activeTabText]}>
              {tab.replace('_', ' ').toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={themedStyles.sectionTitle}>Add New Item</Text>

        <Text style={themedStyles.label}>Target School</Text>
        <View style={themedStyles.pickerContainer}>
          {fetchingSchools ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.pickerLoading} />
          ) : (
            <Picker
              selectedValue={selectedSchool}
              style={themedStyles.picker}
              dropdownIconColor={colors.textPrimary}
              onValueChange={(itemValue: string) => setSelectedSchool(itemValue)}
            >
              <Picker.Item label="Select a school..." value="" />
              {schools.map(s => (
                <Picker.Item key={s.id} label={`${s.name} (${s.id})`} value={s.id.toString()} />
              ))}
            </Picker>
          )}
        </View>

        <Text style={themedStyles.label}>Title</Text>
        <TextInput 
          style={themedStyles.input} 
          placeholder="Title" 
          value={title} 
          onChangeText={setTitle} 
          placeholderTextColor={INPUT_PLACEHOLDER_COLOR} 
        />

        <Text style={themedStyles.label}>Description</Text>
        <TextInput 
          style={[themedStyles.input, styles.textArea]} 
          placeholder="Short Description" 
          value={description} 
          onChangeText={setDescription} 
          multiline 
          placeholderTextColor={INPUT_PLACEHOLDER_COLOR} 
        />

        {activeTab === 'money_science' && (
          <>
            <Text style={themedStyles.label}>Age Group</Text>
            <TextInput 
              style={themedStyles.input} 
              placeholder="e.g. 6-8" 
              value={ageGroup} 
              onChangeText={setAgeGroup} 
              placeholderTextColor={INPUT_PLACEHOLDER_COLOR} 
            />
            
            <Text style={themedStyles.label}>Duration (mins)</Text>
            <TextInput 
              style={themedStyles.input} 
              placeholder="e.g. 15" 
              value={duration} 
              onChangeText={setDuration} 
              keyboardType='numeric' 
              placeholderTextColor={INPUT_PLACEHOLDER_COLOR} 
            />
            
            <Text style={themedStyles.label}>Total Points</Text>
            <TextInput 
              style={themedStyles.input} 
              placeholder="e.g. 10" 
              value={points} 
              onChangeText={setPoints} 
              keyboardType='numeric' 
              placeholderTextColor={INPUT_PLACEHOLDER_COLOR} 
            />
          </>
        )}

        <Text style={themedStyles.label}>
          {activeTab === 'science_projects' ? 'Materials (Line separated)' : 'Content Body (Markdown)'}
        </Text>
        <TextInput 
          style={[themedStyles.input, styles.largeArea]} 
          placeholder="Enter detailed content..." 
          value={contentBody} 
          onChangeText={setContentBody} 
          multiline 
          placeholderTextColor={INPUT_PLACEHOLDER_COLOR} 
        />

        <Text style={themedStyles.label}>Video / YouTube Link (Optional)</Text>
        <TextInput 
          style={themedStyles.input} 
          placeholder="https://youtube.com/..." 
          value={videoUrl} 
          onChangeText={setVideoUrl} 
          placeholderTextColor={INPUT_PLACEHOLDER_COLOR} 
          autoCapitalize="none"
          keyboardType="url"
        />

        <Pressable
          style={({ pressed }) => [
            themedStyles.submitBtn,
            loading && styles.disabledBtn,
            ...pressableWebStyles(pressed, { disabled: loading, pressedOpacity: 0.85 }),
          ]}
          onPress={safePressHandler(handleSubmit)}
          disabled={loading}
        >
          <Text style={styles.submitBtnText}>{loading ? 'Saving...' : 'Create Content'}</Text>
        </Pressable>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  backBtn: {
    marginRight: 16,
    padding: 8,
  },
  backBtnText: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {},
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    paddingVertical: 20,
    paddingHorizontal: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  pickerLoading: {
    padding: 10,
  },
  picker: {
    height: 50,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    fontSize: 15,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  largeArea: {
    height: 200,
    textAlignVertical: 'top',
  },
  submitBtn: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
