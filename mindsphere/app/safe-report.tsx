// app/safe-report.tsx
import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Alert,
  Image,
  Linking
} from 'react-native';
import { useRouter } from 'expo-router';
import BottomNavBar from './components/BottomNavBar';

// ---------- Icons (image-based) ----------
const EmergencyIcon = () => (
  <Image
    source={require('../assets/images/police.png')}
    style={{ width: 48, height: 48 }}
    resizeMode="contain"
  />
);

const LifelineIcon = () => (
  <Image
    source={require('../assets/images/suicide.png')}
    style={{ width: 48, height: 48 }}
    resizeMode="contain"
  />
);

const WomanIcon = () => (
  <Image
    source={require('../assets/images/woman.png')}
    style={{ width: 48, height: 48 }}
    resizeMode="contain"
  />
);

const ManIcon = () => (
  <Image
    source={require('../assets/images/man.png')}
    style={{ width: 48, height: 48 }}
    resizeMode="contain"
  />
);

const ChildIcon = () => (
  <Image
    source={require('../assets/images/baby-icon.png')}
    style={{ width: 48, height: 48 }}
    resizeMode="contain"
  />
);

const ReportIcon = () => (
  <Image
    source={require('../assets/images/report.png')}
    style={{ width: 48, height: 48 }}
    resizeMode="contain"
  />
);


// ---------- Types ----------
type ReportTypeId =
  | 'emergency'
  | 'suicide'
  | 'domestic_violence_women'
  | 'domestic_violence_men'
  | 'child_abuse'
  | 'crime_violence';

interface ReportType {
  id: ReportTypeId;
  label: string;
  icon: React.ComponentType<any>;
  iconBgColor: string;
  borderColor: string;
}

export default function SafeReport() {
  const router = useRouter();

  // Grid cards (calls only)
  const reportTypes: ReportType[] = [
    {
      id: 'emergency',
      label: 'Call 911\nDispatcher',
      icon: EmergencyIcon,
      iconBgColor: '#0142cfff',
      borderColor: '#2563EB',
    },
    {
      id: 'suicide',
      label: 'Call Suicide\nPrevention Hotline',
      icon: LifelineIcon,
      iconBgColor: '#FEF3C7',
      borderColor: '#EAB308',
    },
    {
      id: 'domestic_violence_women',
      label: 'Call Women\nDomestic Violence\nHelpline',
      icon: WomanIcon,
      iconBgColor: '#FCE7F3',
      borderColor: '#EC4899',
    },
    {
      id: 'domestic_violence_men',
      label: 'Call Men\nDomestic Violence\nHelpline',
      icon: ManIcon,
      iconBgColor: '#DBEAFE',
      borderColor: '#3B82F6',
    },
    {
      id: 'child_abuse',
      label: 'Report\nChild\nAbuse',
      icon: ChildIcon,
      iconBgColor: '#F3E8FF',
      borderColor: '#A855F7',
    },
    {
      id: 'crime_violence',
      label: 'Report\nCrime and Violence',
      icon: ReportIcon,
      iconBgColor: '#CCFBF1',
      borderColor: '#14B8A6',
    },
  ];

  // Hotline directory
  const phoneNumbers: Record<ReportTypeId, string> = {
    emergency: '119',
    suicide: '888-639-5433',
    domestic_violence_women: '876-929-2997',
    domestic_violence_men: '888-429-5463',
    child_abuse: '888-776-7328',
    crime_violence: '311',
  };

  const handleEmergencyCall = (type: ReportTypeId) => {
    const number = phoneNumbers[type];
    if (!number) return;

    Alert.alert(
      'Emergency Call',
      `Call ${number}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call Now', onPress: () => Linking.openURL(`tel:${number}`) },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with background image */}
        <View style={styles.headerBackground}>
          <Image
            source={require('../assets/images/spiral-background.png')}
            style={styles.headerImage}
            resizeMode="cover"
          />
          <Text style={styles.title}>Safe Report</Text>
        </View>

        {/* Main Content Container with Curve */}
        <View style={styles.mainContentContainer}>
          {/* Info Card with curved border */}
          <View style={styles.infoCardWrapper}>
            <View style={styles.infoCard}>
              <Text style={styles.infoText}>
                Choose an option below to get immediate help.
              </Text>
              <Text style={styles.urgentText}>If you are in urgent danger call 1 1 9</Text>
            </View>
          </View>

          {/* Call Options Grid */}
          <View style={styles.optionsGrid}>
            {reportTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[styles.optionCard, { borderColor: type.borderColor }]}
                onPress={() => handleEmergencyCall(type.id)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={type.label.replace(/\n/g, ' ')}
              >
                <View style={[styles.iconCircle, { backgroundColor: type.iconBgColor }]}>
                  <type.icon />
                </View>
                <Text style={styles.optionLabel}>{type.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <BottomNavBar />
    </View>
  );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#ffffff'
  },
  scrollView: { 
    flex: 1 
  },
  contentContainer: { 
    paddingTop: 0,
  },

  headerBackground: {
    width: '100%',
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
    position: 'relative',
  },
  headerImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    zIndex: 1,
  },

  mainContentContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 20,
    paddingHorizontal: 20,
    marginTop: -20,
  },

  infoCardWrapper: {
    marginBottom: 20,
    backgroundColor: '#f0f9ff',
    borderRadius: 30,
    padding: 3,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 20,
  },
  infoText: {
    fontSize: 15,
    textAlign: 'center',
    color: '#000000',
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 4,
  },
  urgentText: { 
    fontSize: 15,
    textAlign: 'center',
    color: '#DC2626', 
    fontWeight: '700',
    fontStyle: 'italic',
  },

  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  optionCard: {
    width: '47%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 3,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    color: '#000000',
    lineHeight: 18,
  },
});