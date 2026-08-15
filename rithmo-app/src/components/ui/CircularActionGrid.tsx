/**
 * CircularActionGrid — Grid of circular action buttons arranged in a circular pattern
 * Features: circular layout, animated entrance, completion tracking
 */
import React, { memo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { CircularButton } from './CircularButton';

export interface QuickAction {
  id: string;
  icon: string;
  label?: string;
  colors?: string[];
  completed?: boolean;
  completionProgress?: number;
  onPress: () => void;
  showLabel?: boolean;
}

interface CircularActionGridProps {
  actions: QuickAction[];
  style?: ViewStyle;
  showLabels?: boolean;
}

export const CircularActionGrid = memo(function CircularActionGrid({
  actions,
  style,
  showLabels = false,
}: CircularActionGridProps) {
  // Arrange in a 2x2 grid for 4 actions, or adapt based on count
  const renderGrid = () => {
    if (actions.length <= 4) {
      return (
        <View style={styles.grid}>
          {actions.map((action, index) => (
            <View key={action.id} style={styles.gridItem}>
              <CircularButton
                icon={action.icon}
                label={action.label}
                onPress={action.onPress}
                colors={action.colors}
                completed={action.completed}
                completionProgress={action.completionProgress}
                size={72}
                showLabel={action.showLabel ?? showLabels}
              />
            </View>
          ))}
        </View>
      );
    }

    // For more than 4 actions, use a circular arc layout
    return (
      <View style={styles.arcContainer}>
        {actions.map((action, index) => {
          const angle = (index / actions.length) * Math.PI * 1.5 - Math.PI * 0.75;
          const radius = 100;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          return (
            <View
              key={action.id}
              style={[
                styles.arcItem,
                {
                  transform: [{ translateX: x }, { translateY: y }],
                },
              ]}
            >
              <CircularButton
                icon={action.icon}
                label={action.label}
                onPress={action.onPress}
                colors={action.colors}
                completed={action.completed}
                completionProgress={action.completionProgress}
                size={64}
                showLabel={action.showLabel ?? showLabels}
              />
            </View>
          );
        })}
      </View>
    );
  };

  return <View style={[styles.container, style]}>{renderGrid()}</View>;
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
  },
  gridItem: {
    width: '45%',
    alignItems: 'center',
    marginVertical: 12,
  },
  arcContainer: {
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  arcItem: {
    position: 'absolute',
  },
});
